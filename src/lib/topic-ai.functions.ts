
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { generateWithFallback } from "./ai-gateway.server";
import {
  getCachedTopic,
  setCachedTopic,
  topicCacheKey,
} from "./topic-cache.server";
import {
  checkRateLimit,
  getClientIdFromRequest,
} from "./rate-limit.server";

const Input = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(120),
  topic: z.string().min(1).max(160),
});

class RateLimitedError extends Error {}

export const generateTopicContent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const key = topicCacheKey(
      data.subject,
      data.unit,
      data.topic
    );

    // Return cached notes when available.
    const cached = getCachedTopic(key);

    if (cached) {
      return {
        markdown: cached,
        cached: true as const,
      };
    }

    // Rate limit actual AI generations.
    try {
      const request = getRequest();

      if (request) {
        const clientId = getClientIdFromRequest(request);

        const rl = checkRateLimit(`topic:${clientId}`, {
          windowMs: 60_000,
          max: 15,
        });

        if (!rl.allowed) {
          throw new RateLimitedError(
            "You're generating notes too quickly. Please wait a few seconds and try again."
          );
        }
      }
    } catch (err) {
      if (err instanceof RateLimitedError) {
        throw err;
      }
      // Fail open if request information is unavailable.
    }

    const prompt = `You are an expert professor creating exam-ready study notes for a B.Tech CSE (AI & ML) 5th semester student in India.

Subject: ${data.subject}
Unit: ${data.unit}
Topic: ${data.topic}

TASK:
Generate a complete, accurate and well-structured revision guide in Markdown.

STRICT SECTION ORDER:
You MUST generate all 16 sections in exactly this order.

## Hinglish Explanation
Explain the topic FIRST in Hinglish (Roman-script Hindi + English mix), like a friendly senior explaining before an exam. Write 3-4 short paragraphs.

## Easy Explanation (English)
Write 2-3 short paragraphs in simple beginner-friendly English. Include easy analogies.

## Detailed Explanation (English)
Write 4-6 paragraphs with formal, textbook-quality explanations and technical accuracy.

## Real-World Example
Provide one concrete real-world example with 2-3 lines of context.

## Key Definitions
Provide 3-6 crisp definitions using bullet points.

## Key Points
Provide 5-8 important bullet points a student must remember.

## Advantages
Provide 3-5 advantages in bullet points.

## Disadvantages / Limitations
Provide 3-5 limitations in bullet points.

## Applications
Provide 3-5 practical applications in bullet points.

## Diagram / Flow (ASCII)
Provide a small ASCII diagram or flow inside a fenced text code block.

## Comparison Table
Provide a valid Markdown comparison table with a related concept. If not applicable, clearly write "Not applicable".

## Interview Questions
Provide exactly 5 numbered interview questions.
Each question must be bold.
Put its answer on the next line.
Keep every question-answer pair separate.

## Viva Questions
Provide exactly 5 numbered viva questions.
Each question must be bold.
Put its answer on the next line.
Keep every question-answer pair separate.

## Memory Trick
Provide one useful mnemonic or acronym to remember the topic.

## Formula Sheet
Include all relevant formulas with brief explanations.
Use valid LaTeX formatting.
If the topic has no formulas, write:
"No formulas — conceptual topic".

## Summary
Write a concise 3-4 line exam-ready summary.

STRICT OUTPUT FORMATTING:

1. MARKDOWN HEADINGS:
- Every section MUST start with a separate Markdown ## heading.
- Keep all 16 sections in the exact order specified above.
- Add a blank line before and after each section heading.
- Never merge different sections into one paragraph.
- Do not create an H1 heading for the topic title.

2. BOLD AND TEXT:
- Use **text** for bold formatting.
- Never unnecessarily escape Markdown characters.
- Correct: **Important Concept**
- Incorrect: \\*\\*Important Concept\\*\\*
- Do not add random backslashes before normal text.
- Use readable paragraphs and consistent spacing.

3. MATHEMATICAL FORMULAS:
- Always use valid LaTeX syntax.
- Use $...$ for inline mathematical expressions.
- Use $$...$$ for standalone equations.
- Put standalone equations on separate lines.
- Never output standalone equations without math delimiters.
- Never wrap mathematical equations inside math code blocks.
- Use standard LaTeX commands such as:
  \\frac{}{}, \\sum, \\lambda, \\theta, \\nabla, \\sqrt{}, \\int
- Never unnecessarily double-escape LaTeX commands.
- Preserve subscripts, superscripts, fractions, Greek symbols and mathematical operators.
- Use \\|...\\| for mathematical norms.
- Never replace mathematical notation with random Unicode characters.
- Match every opening and closing math delimiter correctly.
- Do not put Markdown bold syntax inside mathematical expressions.

4. NUMBERED LISTS:
- Use proper Markdown numbered lists.
- Keep each question on a separate line.
- Put each answer on the next line.
- Keep all 5 Interview Questions separate.
- Keep all 5 Viva Questions separate.
- Never merge multiple questions into one paragraph.
- Do not unnecessarily escape numbering.

5. BULLET POINTS:
- Use a hyphen (-) for every bullet point.
- Keep every bullet on a separate line.
- Never combine multiple bullet points into one paragraph.

6. TABLES:
- Use valid Markdown table syntax.
- Always include a header row and separator row.
- Keep columns properly aligned.
- Never put Markdown tables inside code blocks.

7. CODE BLOCKS:
- Use fenced code blocks only for actual programming code or the requested ASCII diagram.
- Use the text language identifier for ASCII diagrams.
- Never put mathematical formulas inside code blocks.

8. LANGUAGE SEPARATION:
- Keep Hinglish Explanation entirely separate from Easy Explanation (English).
- Keep Detailed Explanation (English) separate.
- Do not mix the language of these sections.
- Use simple, student-friendly language.
- Preserve technical terms in English.

9. CONTENT PRESERVATION:
- Never omit any of the 16 required sections.
- Never change the section order.
- Do not shorten important explanations.
- Do not remove relevant formulas, examples, definitions or key points.
- Avoid unnecessary filler content.
- If a section is not applicable, explain that clearly instead of omitting it.

10. FINAL VALIDATION:
- Check that all 16 headings are present and correctly ordered.
- Check all Markdown bold syntax.
- Check all numbered and bullet lists.
- Check all mathematical formulas and delimiters.
- Check that no section is merged with another.
- Check that the output can be rendered using ReactMarkdown, remark-math, remark-gfm and rehype-katex.
- Return clean, properly structured Markdown only.
- Never include explanations about these formatting rules in the generated notes.

`;

    const { text } = await generateWithFallback({ prompt });

    setCachedTopic(key, text);

    return {
      markdown: text,
      cached: false as const,
    };
  });
