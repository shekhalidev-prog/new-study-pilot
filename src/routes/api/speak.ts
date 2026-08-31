import { createFileRoute } from "@tanstack/react-router";

type Body = { text?: string; voice?: string; speed?: number };

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { text, voice, speed } = (await request.json()) as Body;
        if (!text || typeof text !== "string") {
          return new Response("text required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts",
              input: text.slice(0, 4000),
              voice: voice ?? "alloy",
              speed: typeof speed === "number" ? speed : 1,
              stream_format: "sse",
              response_format: "pcm",
              instructions:
                "Speak warmly, clearly, and with gentle enthusiasm — like a helpful friend explaining something interesting.",
            }),
            signal: request.signal,
          });
          if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "");
            return new Response(detail || "TTS failed", { status: upstream.status });
          }
          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw err;
        }
      },
    },
  },
});
