import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { generateWithFallback } from "./ai-gateway.server";
import { getCachedTopic, setCachedTopic, topicCacheKey } from "./topic-cache.server";
import { checkRateLimit, getClientIdFromRequest } from "./rate-limit.server";

const Input = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(120),
  topic: z.string().min(1).max(160),
});

class RateLimitedError extends Error {}

export const generateTopicContent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = topicCacheKey(data.subject, data.unit, data.topic);

    // Shared cache: if any user already generated notes for this exact
    // subject/unit/topic, return them instantly — no AI call at all.
    const cached = getCachedTopic(key);
    if (cached) {
      return { markdown: cached, cached: true as const };
    }

    // Only rate-limit actual generations (cache hits are free and instant,
    // so they shouldn't count against a user's quota).
    try {
      const request = getWebRequest();
      if (request) {
        const clientId = getClientIdFromRequest(request);
        const rl = checkRateLimit(`topic:${clientId}`, { windowMs: 60_000, max: 15 });
        if (!rl.allowed) {
          throw new RateLimitedError(
            "You're generating notes too quickly. Please wait a few seconds and try again.",
          );
        }
      }
    } catch (err) {
      if (err instanceof RateLimitedError) throw err;
      // If we can't read the request for some reason, fail open rather than
      // blocking note generation entirely.
    }

    const prompt = `You are an expert professor creating exam-ready study notes for a B.Tech CSE (AI & ML) 5th semester student in India.

Subject: ${data.subject}
Unit: ${data.unit}
Topic: ${data.topic}

Generate a complete, well-structured revision guide in **Markdown** with these sections in this exact order (use ## headings):

## Hinglish Explanation
Explain the topic FIRST in Hinglish (Roman-script Hindi + English mix) — like a friendly senior explaining right before an exam. 3–4 short paragraphs, simple and clear.

## Easy Explanation (English)
2–3 short paragraphs any beginner can understand. Use simple analogies.

## Detailed Explanation (English)
Formal, textbook-quality explanation with technical accuracy. 4–6 paragraphs.


## Real-World Example
One concrete real-world example with 2–3 lines of context.

## Key Definitions
Bullet list of 3–6 crisp definitions.

## Key Points
5–8 bullet points a student MUST remember.

## Advantages
Bullet list (3–5 items).

## Disadvantages / Limitations
Bullet list (3–5 items).

## Applications
Bullet list (3–5 items).

## Diagram / Flow (ASCII)
Provide a small ASCII diagram or flow (wrap in a \`\`\`text code block) showing the concept.

## Comparison Table
A Markdown table comparing this concept with a related concept (if applicable), else "Not applicable".

## Interview Questions
5 numbered short interview questions with 1–2 line answers.

## Viva Questions
5 numbered viva questions with concise answers.

## Memory Trick
One mnemonic or acronym to remember this topic.

## Formula Sheet
Relevant formulas (if any). If no formulas, say "No formulas — conceptual topic".

## Summary
3–4 line exam-ready summary.

Rules:
- Be accurate and specific to the topic — no filler.
- Keep it dense but scannable.
- Never break the section order.
- Do not include the topic title as an H1.`;

    const { text } = await generateWithFallback({ prompt });

    setCachedTopic(key, text);

    return { markdown: text, cached: false as const };
  });
