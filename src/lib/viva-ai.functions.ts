import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateJsonWithFallback, guardRateLimit } from "./ai-fallback.server";

export type VivaQuestion = {
  question: string;
  topic: string;
  idealAnswer: string;
  keyPoints: string[];
};

export type VivaEvaluation = {
  confidence: number;
  knowledge: number;
  fluency: number;
  verdict: string;
  perQuestion: { question: string; score: number; feedback: string }[];
  strengths: string[];
  improvements: string[];
};

const QuestionsInput = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(200),
  topics: z.array(z.string().max(200)).max(60).default([]),
  count: z.number().int().min(3).max(10).default(6),
});

export const generateVivaQuestions = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => QuestionsInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("viva-questions", 10);

    const prompt = `You are an external examiner conducting a university VIVA (oral exam) for a B.Tech CSE (AI & ML) student in India.

Subject: ${data.subject}
Chapter / Unit: ${data.unit}
Topics: ${data.topics.join(", ") || "all topics of this unit"}

Produce exactly ${data.count} viva questions, ordered easy → hard, the way a real examiner asks them (short, spoken, one idea each).

Return ONLY raw JSON (no markdown fences):
{"questions":[{"question":"...","topic":"sub-topic","idealAnswer":"3-4 line model answer","keyPoints":["point","point","point"]}]}`;

    const { data: questions } = await generateJsonWithFallback<VivaQuestion[]>({
      prompt,
      parse: (raw) => {
        const list =
          (
            raw as {
              questions?: Array<{
                question?: string;
                topic?: string;
                idealAnswer?: string;
                keyPoints?: string[];
              }>;
            }
          ).questions ?? [];
        const cleaned = list
          .slice(0, data.count)
          .map((q) => ({
            question: String(q.question ?? ""),
            topic: String(q.topic ?? data.unit),
            idealAnswer: String(q.idealAnswer ?? ""),
            keyPoints: (q.keyPoints ?? []).map(String).slice(0, 6),
          }))
          .filter((q) => q.question.trim());
        if (cleaned.length === 0) throw new Error("No valid viva questions in reply");
        return cleaned;
      },
    });
    return { questions };
  });

const EvalInput = z.object({
  subject: z.string().min(1).max(120),
  unit: z.string().min(1).max(200),
  answers: z
    .array(
      z.object({
        question: z.string().max(600),
        idealAnswer: z.string().max(2000).default(""),
        spoken: z.string().max(4000).default(""),
        seconds: z.number().min(0).max(3600).default(0),
      }),
    )
    .min(1)
    .max(10),
});

export const evaluateViva = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => EvalInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("viva-eval", 10);

    const block = data.answers
      .map(
        (a, i) =>
          `Q${i + 1}: ${a.question}\nExpected: ${a.idealAnswer}\nStudent said (${Math.round(a.seconds)}s): ${a.spoken || "(no answer / silence)"}`,
      )
      .join("\n\n");

    const prompt = `You are a strict but fair viva examiner evaluating a B.Tech CSE (AI & ML) student's spoken viva.

Subject: ${data.subject}
Unit: ${data.unit}

Transcript:
${block}

Judge correctness, completeness, terminology, and speaking confidence (answer length vs time, hesitation words like "umm", empty answers score 0).

Return ONLY raw JSON (no fences):
{"confidence":0-100,"knowledge":0-100,"fluency":0-100,"verdict":"one encouraging line in simple Hinglish","perQuestion":[{"question":"short form of question","score":0-10,"feedback":"1-2 lines, what was missing"}],"strengths":["..."],"improvements":["..."]}`;

    const { data: result } = await generateJsonWithFallback<VivaEvaluation>({
      prompt,
      parse: (raw) => {
        const p = raw as Partial<VivaEvaluation>;
        const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
        return {
          confidence: clamp(p.confidence),
          knowledge: clamp(p.knowledge),
          fluency: clamp(p.fluency),
          verdict: String(p.verdict ?? ""),
          perQuestion: (p.perQuestion ?? []).map((q) => ({
            question: String(q.question ?? ""),
            score: Math.max(0, Math.min(10, Math.round(Number(q.score) || 0))),
            feedback: String(q.feedback ?? ""),
          })),
          strengths: (p.strengths ?? []).map(String).slice(0, 5),
          improvements: (p.improvements ?? []).map(String).slice(0, 5),
        };
      },
    });
    return result;
  });
