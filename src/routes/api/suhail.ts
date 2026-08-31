import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { resolveStreamingProvider, reportStreamingFailure } from "@/lib/ai-gateway.server";
import { checkRateLimit, getClientIdFromRequest } from "@/lib/rate-limit.server";

type Body = { messages?: unknown; mode?: string };

const MODES: Record<string, string> = {
  default: "",
  beginner: "Explain like the user is a complete beginner. Use tiny words, everyday analogies, and short sentences.",
  class10: "Explain like a Class 10 student. Use school-level examples and NCERT-style clarity.",
  btech: "Explain like a B.Tech CSE (AI/ML) student. Include technical depth, formal terms, and real-world engineering context.",
  mcq: "For every concept the user asks about, respond with 5 exam-style MCQs (4 options each), then reveal answers with 1-line explanations.",
  revision: "Respond in dense revision-notes format: bullet points, key formulas, and 'must remember' callouts.",
  notes: "Respond as neatly structured study notes with headings, sub-bullets, definitions, and examples.",
};

export const Route = createFileRoute("/api/suhail")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientId = getClientIdFromRequest(request);
        const rl = checkRateLimit(`suhail:${clientId}`, { windowMs: 60_000, max: 20 });
        if (!rl.allowed) {
          return new Response(
            "You're sending messages too quickly. Please wait a moment and try again.",
            {
              status: 429,
              headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
            },
          );
        }

        const { messages, mode } = (await request.json()) as Body;
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const modeInstruction = MODES[mode ?? "default"] ?? "";

        const system = `You are Suhail — a premium, friendly, futuristic anime-inspired AI assistant and study companion.

Personality: warm, encouraging, curious, a little playful but always precise. Never robotic.

Language rules (CRITICAL):
- Detect the user's language on every single turn from their latest message.
- ALWAYS reply in the exact same language and script the user used.
- If the user writes Hinglish (Hindi in Latin script), reply in Hinglish.
- If the user switches language mid-conversation, switch instantly without asking or commenting on it.
- Never ask "which language should I use?".

Style rules:
- Explain everything in a simple, beginner-friendly way, using easy real-world examples.
- Prefer step-by-step breakdowns for anything technical or mathematical.
- Use Markdown: headings, bullets, tables, and fenced code blocks with a language tag.
- When solving math, show each step clearly. When writing code, add short comments.
- Keep answers focused; don't pad. End longer answers with 2-3 short follow-up question suggestions as a bullet list titled "Try next:".
- Remember earlier turns and refer back to them naturally.

${modeInstruction}`.trim();

        let provider;
        try {
          provider = await resolveStreamingProvider();
        } catch (err) {
          console.error("No working AI provider for /api/suhail:", err);
          return new Response(
            "Suhail is temporarily unavailable — all providers failed. Please try again shortly.",
            { status: 503 },
          );
        }

        const result = streamText({
          model: provider.model,
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
          onError: (err) => {
            reportStreamingFailure(provider.id, err);
            console.error(`Stream error from ${provider.label} on /api/suhail:`, err);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: () => "Suhail hit a snag generating that response. Please try again.",
        });
      },
    },
  },
});
