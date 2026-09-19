import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateWithFallback } from "./ai-gateway.server";
import { generateJsonWithFallback, guardRateLimit } from "./ai-fallback.server";

const RevisionInput = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(200),
  topics: z.array(z.string().max(200)).max(60).default([]),
  minutes: z.union([z.literal(5), z.literal(15), z.literal(30), z.literal(60)]),
});

const depthFor = (m: number) => {
  if (m === 5)
    return "Ultra-compressed flash revision. Only the absolute must-know. Max ~350 words total.";
  if (m === 15) return "Quick but complete revision. ~700 words total.";
  if (m === 30) return "Solid revision with examples and short derivations. ~1300 words.";
  return "Deep exam-day revision: full coverage, worked examples, diagrams. ~2200 words.";
};

export const generateRevision = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => RevisionInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("revision", 10);

    const subjectLower = data.subject.toLowerCase();
    const extraSection =
      subjectLower.includes("intelligence") || subjectLower.includes("learning")
        ? "## Algorithms\n(step-wise pseudocode)\n"
        : subjectLower.includes("operating")
          ? "## Commands & Concepts\n(important OS commands / system calls with one-line use)\n"
          : subjectLower.includes("constitution")
            ? "## Important Articles & Constitutional Facts\n(article number + what it says)\n"
            : "";

    const prompt = `You are an expert professor preparing a timed revision sheet for a B.Tech CSE (AI & ML) student in India.

Subject: ${data.subject}
Chapter / Unit: ${data.unit}
Syllabus topics: ${data.topics.join(", ") || "all topics of this unit"}
Revision time available: ${data.minutes} minutes.

Depth rule: ${depthFor(data.minutes)}

Output **Markdown** using ## headings, in this exact order. Skip a section only if truly not applicable (then write "Not applicable").

## Important Concepts
## Key Definitions
## Important Points
## Frequently Asked University Questions
## Expected Exam Questions
## Important Diagrams
(ASCII diagram inside a \`\`\`text block, if applicable)
## Flowcharts
(ASCII flowchart inside a \`\`\`text block, if applicable)
${extraSection}## Memory Tricks
## One-Line Revision Notes
(numbered, rapid-fire one-liners)
## Common Mistakes to Avoid

Rules: be accurate and specific, no filler, dense and scannable, respect the time budget, never output an H1.`;

    const { text } = await generateWithFallback({ prompt });
    return { markdown: text };
  });

const QuizInput = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(200),
  topics: z.array(z.string().max(200)).max(60).default([]),
});

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
};

export const generateRevisionQuiz = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => QuizInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("revision-quiz", 10);

    const prompt = `Create exactly 10 exam-style MCQs for a B.Tech CSE (AI & ML) student.

Subject: ${data.subject}
Chapter / Unit: ${data.unit}
Topics: ${data.topics.join(", ") || "all topics of this unit"}

Return ONLY raw JSON (no markdown fences) of this shape:
{"questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"2-3 line explanation","topic":"the syllabus sub-topic this tests"}]}

Rules: 4 options each, exactly one correct, mix easy/medium/hard, no duplicate questions, explanation must justify the correct option.`;

    const { data: questions } = await generateJsonWithFallback<QuizQuestion[]>({
      prompt,
      parse: (raw) => {
        const list = (raw as { questions?: QuizQuestion[] }).questions ?? [];
        const cleaned = list
          .filter((q) => Array.isArray(q.options) && q.options.length >= 2)
          .slice(0, 10)
          .map((q) => ({
            question: String(q.question),
            options: q.options.map(String),
            answerIndex: Math.max(
              0,
              Math.min(q.options.length - 1, Math.trunc(Number(q.answerIndex)) || 0),
            ),
            explanation: String(q.explanation ?? ""),
            topic: String(q.topic ?? data.unit),
          }));
        if (cleaned.length === 0) throw new Error("No valid questions in reply");
        return cleaned;
      },
    });
    return { questions };
  });

const PredictInput = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(200),
  topics: z.array(z.string().max(200)).max(60).default([]),
  pyqs: z
    .array(
      z.object({
        title: z.string().max(300),
        year: z.string().max(20).default(""),
        notes: z.string().max(2000).default(""),
      }),
    )
    .max(40)
    .default([]),
});

export const generatePredictedQuestions = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => PredictInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("revision-predict", 10);

    const pyqBlock = data.pyqs.length
      ? data.pyqs
          .map(
            (p) => `- ${p.year ? `[${p.year}] ` : ""}${p.title}${p.notes ? ` — ${p.notes}` : ""}`,
          )
          .join("\n")
      : "No previous-year papers provided. Rely on standard university exam trends for this syllabus in India (AKTU/VTU/RGPV style).";

    const prompt = `You are an exam paper analyst for B.Tech CSE (AI & ML) in India.

Subject: ${data.subject}
Chapter / Unit: ${data.unit}
Syllabus topics: ${data.topics.join(", ") || "all topics of this unit"}

Previous year question data:
${pyqBlock}

Analyse repetition patterns, weightage and syllabus coverage, then predict the most likely questions for the upcoming exam.

Output **Markdown** only (never an H1), in this exact order:

## Exam Trend Analysis
(3-5 bullets: which topics repeat, typical marks split, question style)

## 🔥 High Probability Questions
(numbered list. For each: the question, then on the next line in italics: \`Marks: X · Probability: NN% · Topic: ...\`)

## Medium Probability Questions
(same format)

## Short Notes / 2-Mark Questions
(numbered one-liners)

## Numerical / Derivation Questions
(only if the subject has them, else "Not applicable")

## How To Answer (Model Structure)
(for the top 2 questions, give a crisp answer skeleton: definition → diagram → points → example → conclusion)

## Must-Do Before Exam
(5 bullets)

Rules: be specific to the syllabus topics given, give realistic percentages, no filler, at least 8 high-probability questions.`;

    const { text } = await generateWithFallback({ prompt });
    return { markdown: text };
  });
