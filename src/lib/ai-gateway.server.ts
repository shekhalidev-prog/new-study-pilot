import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type LanguageModel } from "ai";

/**
 * Multi-provider AI gateway.
 *
 * Providers are tried in a fixed priority order, and only providers that
 * have an API key present in `.env` are considered at all. This keeps the
 * app cheap (free-tier providers first) and resilient (if one provider is
 * rate-limited, deprecated, or down, the next one is tried automatically).
 *
 * Priority order: Groq -> Gemini -> NVIDIA -> OpenRouter -> Cerebras -> OpenAI
 */

export type ProviderId =
  | "groq"
  | "gemini"
  | "nvidia"
  | "openrouter"
  | "cerebras"
  | "openai";

interface ProviderDefinition {
  id: ProviderId;
  label: string;
  apiKeyEnv: string;
  baseURL: string;
  modelEnv: string;
  defaultModel: string;
}

// Order here IS the fallback order.
const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: "groq",
    label: "Groq",
    apiKeyEnv: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    modelEnv: "GROQ_MODEL",
    defaultModel: "openai/gpt-oss-120b",
  },
  {
    id: "gemini",
    label: "Gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "nvidia",
    label: "NVIDIA",
    apiKeyEnv: "NVIDIA_API_KEY",
    baseURL: "https://integrate.api.nvidia.com/v1",
    modelEnv: "NVIDIA_MODEL",
    defaultModel: "meta/llama-3.1-70b-instruct",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    apiKeyEnv: "CEREBRAS_API_KEY",
    baseURL: "https://api.cerebras.ai/v1",
    modelEnv: "CEREBRAS_MODEL",
    defaultModel: "llama-3.3-70b",
  },
  {
    id: "openai",
    label: "OpenAI",
    apiKeyEnv: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
  },
];

export interface ResolvedProvider {
  id: ProviderId;
  label: string;
  modelId: string;
  model: LanguageModel;
}

function buildProvider(def: ProviderDefinition, apiKey: string): ResolvedProvider {
  const provider = createOpenAICompatible({
    name: def.id,
    baseURL: def.baseURL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const modelId = process.env[def.modelEnv]?.trim() || def.defaultModel;
  return { id: def.id, label: def.label, modelId, model: provider(modelId) };
}

/** All providers that currently have an API key configured, in priority order. */
export function getConfiguredProviders(): ResolvedProvider[] {
  const resolved: ResolvedProvider[] = [];
  for (const def of PROVIDER_DEFINITIONS) {
    const key = process.env[def.apiKeyEnv]?.trim();
    if (!key) continue;
    try {
      resolved.push(buildProvider(def, key));
    } catch (err) {
      console.warn(`⚠️ Failed to initialize ${def.label} provider:`, err);
    }
  }
  return resolved;
}

export class NoAiProviderError extends Error {
  constructor() {
    super(
      "No AI provider configured. Add at least one of these to your .env file: " +
        "GROQ_API_KEY, GEMINI_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, CEREBRAS_API_KEY, or OPENAI_API_KEY. " +
        "See .env.example for where to get a free key.",
    );
    this.name = "NoAiProviderError";
  }
}

// ---------------------------------------------------------------------------
// Non-streaming fallback chain (used for topic notes generation)
// ---------------------------------------------------------------------------

export interface GenerateWithFallbackResult {
  text: string;
  providerId: ProviderId;
  providerLabel: string;
}

/**
 * Tries every configured provider in priority order until one succeeds.
 * Safe to call even if only a single provider key is configured.
 */
export async function generateWithFallback(params: {
  prompt: string;
  system?: string;
}): Promise<GenerateWithFallbackResult> {
  const providers = getConfiguredProviders();
  if (providers.length === 0) throw new NoAiProviderError();

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const { text } = await generateText({
        model: provider.model,
        system: params.system,
        prompt: params.prompt,
      });
      if (!text || !text.trim()) throw new Error("Empty response from model");

      console.log(`✅ Topic notes generated using ${provider.label} (${provider.modelId})`);
      return { text, providerId: provider.id, providerLabel: provider.label };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ ${provider.label} failed, trying next provider… (${message})`);
      errors.push(`${provider.label}: ${message}`);
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}

// ---------------------------------------------------------------------------
// Streaming provider resolution (used for /api/chat and /api/suhail)
//
// A stream can't be restarted mid-response once the client is consuming it,
// so instead of falling back after a chunk fails, we run a quick probe call
// ahead of time to find a provider that's currently working, then cache that
// choice for a few minutes so most requests skip the probe entirely. If a
// stream later reports a failure, the cache is invalidated so the next
// request re-checks providers from the top of the priority list.
// ---------------------------------------------------------------------------

const STREAM_CACHE_TTL_MS = 5 * 60 * 1000; // re-probe at most every 5 minutes
const PROBE_TIMEOUT_MS = 8000;

let cachedStreamingProvider: ResolvedProvider | null = null;
let cachedAt = 0;
let probeInFlight: Promise<ResolvedProvider> | null = null;

async function probeProvider(provider: ResolvedProvider): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const { text } = await generateText({
      model: provider.model,
      prompt: "Reply with only the word: ok",
      abortSignal: controller.signal,
    });
    if (!text) throw new Error("Empty probe response");
  } finally {
    clearTimeout(timeout);
  }
}

async function findWorkingStreamingProvider(): Promise<ResolvedProvider> {
  const providers = getConfiguredProviders();
  if (providers.length === 0) throw new NoAiProviderError();

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      await probeProvider(provider);
      console.log(`✅ Streaming provider selected: ${provider.label} (${provider.modelId})`);
      return provider;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ ${provider.label} probe failed, trying next provider… (${message})`);
      errors.push(`${provider.label}: ${message}`);
    }
  }

  throw new Error(`All AI providers failed their health check:\n${errors.join("\n")}`);
}

/**
 * Resolves a provider for a streaming call. Reuses a recently-verified
 * provider when available; otherwise probes providers in priority order.
 * Concurrent callers during a cold cache share a single in-flight probe.
 */
export async function resolveStreamingProvider(): Promise<ResolvedProvider> {
  const isFresh = !!cachedStreamingProvider && Date.now() - cachedAt < STREAM_CACHE_TTL_MS;
  if (isFresh) return cachedStreamingProvider!;

  if (!probeInFlight) {
    probeInFlight = findWorkingStreamingProvider()
      .then((provider) => {
        cachedStreamingProvider = provider;
        cachedAt = Date.now();
        return provider;
      })
      .finally(() => {
        probeInFlight = null;
      });
  }
  return probeInFlight;
}

/** Call when a stream fails so the next request re-checks providers instead of reusing a dead one. */
export function reportStreamingFailure(providerId: ProviderId, error?: unknown): void {
  if (cachedStreamingProvider?.id === providerId) {
    console.warn(
      `⚠️ Streaming provider "${providerId}" reported a failure — invalidating cache for next request.`,
      error instanceof Error ? error.message : error,
    );
    cachedStreamingProvider = null;
    cachedAt = 0;
  }
}
