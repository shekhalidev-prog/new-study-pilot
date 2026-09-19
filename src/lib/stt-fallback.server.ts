/**
 * Speech-to-text with automatic fallback.
 *
 * Order: Groq (Whisper) -> Gemini (audio understanding) -> Lovable AI gateway (legacy).
 * Only providers with a key in `.env` are tried; a provider that errors or times out
 * is skipped and the next one is used.
 *
 * NVIDIA and Cerebras are intentionally not in this chain: Cerebras has no speech-to-text
 * models, and NVIDIA's hosted speech models are gRPC-only (its HTTP API is for self-hosted NIM).
 */

export type SttProviderId = "groq" | "gemini" | "lovable";

export interface SttResult {
  text: string;
  provider: SttProviderId;
}

interface SttProvider {
  id: SttProviderId;
  label: string;
  isConfigured: () => boolean;
  transcribe: (file: File, signal: AbortSignal) => Promise<string>;
}

export class NoSttProviderError extends Error {
  constructor() {
    super(
      "No speech-to-text provider configured. Add GROQ_API_KEY (recommended), GEMINI_API_KEY or LOVABLE_API_KEY to your .env file.",
    );
    this.name = "NoSttProviderError";
  }
}

const PER_PROVIDER_TIMEOUT_MS = 8000;

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

function baseMime(file: File): string {
  const m = (file.type || "audio/webm").split(";")[0].trim().toLowerCase();
  return m === "audio/x-wav" ? "audio/wav" : m;
}

async function errorText(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `${res.status} ${body.slice(0, 200)}`.trim();
}

/** Groq's OpenAI-compatible Whisper endpoint. Accepts webm/mp4/wav/ogg/mp3/flac directly. */
const groq: SttProvider = {
  id: "groq",
  label: "Groq",
  isConfigured: () => !!process.env.GROQ_API_KEY?.trim(),
  transcribe: async (file, signal) => {
    const form = new FormData();
    form.append("model", process.env.GROQ_STT_MODEL?.trim() || "whisper-large-v3-turbo");
    form.append("response_format", "json");
    form.append("file", file, `recording.${EXT_BY_MIME[baseMime(file)] ?? "webm"}`);
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}` },
      body: form,
      signal,
    });
    if (!res.ok) throw new Error(await errorText(res));
    return ((await res.json()) as { text?: string }).text ?? "";
  },
};

/** Gemini: send the audio inline to generateContent and ask for a verbatim transcript. */
const gemini: SttProvider = {
  id: "gemini",
  label: "Gemini",
  isConfigured: () => !!process.env.GEMINI_API_KEY?.trim(),
  transcribe: async (file, signal) => {
    const model =
      process.env.GEMINI_STT_MODEL?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      "gemini-2.5-flash";
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!.trim(),
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Transcribe this audio verbatim. The speaker may mix Hindi and English (Hinglish); write Hindi words in Roman script. " +
                    "Return ONLY the transcript text, no commentary. If there is no speech, return an empty string.",
                },
                { inlineData: { mimeType: baseMime(file), data } },
              ],
            },
          ],
        }),
        signal,
      },
    );
    if (!res.ok) throw new Error(await errorText(res));
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  },
};

/** Legacy path this app already used (Lovable AI gateway). Kept as the last fallback. */
const lovable: SttProvider = {
  id: "lovable",
  label: "Lovable gateway",
  isConfigured: () => !!process.env.LOVABLE_API_KEY?.trim(),
  transcribe: async (file, signal) => {
    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("file", file, `recording.${EXT_BY_MIME[baseMime(file)] ?? "webm"}`);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY!.trim()}` },
      body: upstream,
      signal,
    });
    if (!res.ok) throw new Error(await errorText(res));
    return ((await res.json()) as { text?: string }).text ?? "";
  },
};

// Order here IS the fallback order.
const STT_PROVIDERS: SttProvider[] = [groq, gemini, lovable];

export async function transcribeWithFallback(file: File): Promise<SttResult> {
  const providers = STT_PROVIDERS.filter((p) => p.isConfigured());
  if (providers.length === 0) throw new NoSttProviderError();

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const text = await provider.transcribe(file, AbortSignal.timeout(PER_PROVIDER_TIMEOUT_MS));
      console.log(`✅ Transcribed using ${provider.label}`);
      return { text: text.trim(), provider: provider.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ ${provider.label} transcription failed, trying next provider… (${message})`);
      errors.push(`${provider.label}: ${message}`);
    }
  }
  throw new Error(`All transcription providers failed:\n${errors.join("\n")}`);
}
