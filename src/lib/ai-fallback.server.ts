import { generateText } from "ai";
import { getRequest } from "@tanstack/react-start/server";
import { getConfiguredProviders, NoAiProviderError } from "./ai-gateway.server";
import { checkRateLimit, getClientIdFromRequest } from "./rate-limit.server";

/**
 * Shared helpers for the study-tool server functions (exam plan, revision,
 * viva, study clone). They sit on top of the existing multi-provider gateway,
 * so every call automatically uses the same Groq -> Gemini -> NVIDIA ->
 * OpenRouter -> Cerebras -> OpenAI fallback chain configured through `.env`.
 */

export class RateLimitedError extends Error {
  constructor(message = "You're going too fast. Please wait a few seconds and try again.") {
    super(message);
    this.name = "RateLimitedError";
  }
}

/**
 * Per-client fixed-window rate limit for an AI server function.
 * Fails open if the request can't be read, so a platform quirk never blocks the feature.
 */
export function guardRateLimit(namespace: string, max: number, windowMs = 60_000): void {
  let clientId: string;
  try {
    const request = getRequest();
    if (!request) return;
    clientId = getClientIdFromRequest(request);
  } catch {
    return;
  }
  const rl = checkRateLimit(`${namespace}:${clientId}`, { windowMs, max });
  if (!rl.allowed) {
    throw new RateLimitedError(
      `Too many requests. Please wait ${Math.ceil(rl.retryAfterMs / 1000)}s and try again.`,
    );
  }
}

/** Removes ```json fences and returns the outermost `{ ... }` block of a model reply. */
function extractJsonObject(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Model reply did not contain a JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Like `generateWithFallback`, but for prompts that must return JSON.
 * A provider whose reply can't be parsed/validated counts as a failure, so the
 * next provider in the chain is tried instead of surfacing a JSON error.
 */
export async function generateJsonWithFallback<T>(params: {
  prompt: string;
  system?: string;
  /** Validate + normalise the parsed JSON. Throw to reject the reply. */
  parse: (raw: unknown) => T;
}): Promise<{ data: T; providerLabel: string }> {
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
      const data = params.parse(extractJsonObject(text));
      return { data, providerLabel: provider.label };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ ${provider.label} failed for JSON task, trying next provider… (${message})`);
      errors.push(`${provider.label}: ${message}`);
    }
  }
  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
}
