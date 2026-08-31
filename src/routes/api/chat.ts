import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { resolveStreamingProvider, reportStreamingFailure } from "@/lib/ai-gateway.server";
import { checkRateLimit, getClientIdFromRequest } from "@/lib/rate-limit.server";

type Body = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientId = getClientIdFromRequest(request);
        const rl = checkRateLimit(`chat:${clientId}`, { windowMs: 60_000, max: 20 });
        if (!rl.allowed) {
          return new Response(
            "You're sending messages too quickly. Please wait a moment and try again.",
            {
              status: 429,
              headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
            },
          );
        }

        const { messages } = (await request.json()) as Body;
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }

        let provider;
        try {
          provider = await resolveStreamingProvider();
        } catch (err) {
          console.error("No working AI provider for /api/chat:", err);
          return new Response(
            "Orbit AI is temporarily unavailable — all providers failed. Please try again shortly.",
            { status: 503 },
          );
        }

        const result = streamText({
          model: provider.model,
          system:
            "You are Orbit AI — a friendly, exam-focused study tutor for B.Tech CSE (AI & ML) students in India. Answer clearly with examples. When useful, add Hinglish explanations. Use Markdown with headings, bullets, and code blocks.",
          messages: await convertToModelMessages(messages as UIMessage[]),
          onError: (err) => {
            reportStreamingFailure(provider.id, err);
            console.error(`Stream error from ${provider.label} on /api/chat:`, err);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: () => "The AI tutor hit a snag generating that response. Please try again.",
        });
      },
    },
  },
});
