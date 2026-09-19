import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, getClientIdFromRequest } from "@/lib/rate-limit.server";
import { NoSttProviderError, transcribeWithFallback } from "@/lib/stt-fallback.server";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = checkRateLimit(`transcribe:${getClientIdFromRequest(request)}`, {
          windowMs: 60_000,
          max: 40,
        });
        if (!rl.allowed) {
          return new Response("Too many recordings too quickly. Please wait a moment.", {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
          });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return new Response("file required", { status: 400 });
        }
        if (file.size < 1024) {
          return new Response("Recording too short — try again.", { status: 400 });
        }

        try {
          const { text, provider } = await transcribeWithFallback(file);
          return new Response(JSON.stringify({ text, provider }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          if (err instanceof NoSttProviderError) {
            return new Response(err.message, { status: 503 });
          }
          console.error("Transcription failed:", err);
          return new Response("Transcription failed on every provider. Please try again.", {
            status: 502,
          });
        }
      },
    },
  },
});
