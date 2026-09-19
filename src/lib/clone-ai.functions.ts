import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateWithFallback } from "./ai-gateway.server";
import { guardRateLimit } from "./ai-fallback.server";

const AskInput = z.object({
  notes: z.string().min(1).max(60000),
  question: z.string().min(1).max(2000),
});

export const askMyNotes = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => AskInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("clone-ask", 20);

    const prompt = `You are "Study Clone" — a tutor who has read ONLY the student's own notes below.

=== STUDENT NOTES START ===
${data.notes}
=== STUDENT NOTES END ===

Student question: ${data.question}

Rules:
- Answer strictly from the notes above. Do not invent facts.
- If the notes do not cover it, say clearly: "Ye tumhare notes me nahi hai" and then give a short general answer marked as **Outside your notes**.
- Quote the exact lines/keywords from the notes you used.
- Output Markdown with: "## Hinglish Answer" first, then "## English Answer", then "## From your notes" (bullet quotes).
- Be exam-focused, dense, no filler. Never output an H1.`;

    const { text } = await generateWithFallback({ prompt });
    return { markdown: text };
  });

const SummaryInput = z.object({ notes: z.string().min(1).max(60000) });

export const summarizeMyNotes = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SummaryInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("clone-summary", 8);

    const prompt = `Read the student's own notes and produce a revision pack in Markdown.

=== NOTES ===
${data.notes}
=== END ===

Sections (## headings only, no H1):
## Quick Summary (Hinglish)
## Key Definitions
## Important Points
## Likely Exam Questions (from these notes)
## One-Line Revision
## Gaps in your notes (topics that look missing/incomplete)

Use only what the notes contain, except the final "Gaps" section.`;

    const { text } = await generateWithFallback({ prompt });
    return { markdown: text };
  });
