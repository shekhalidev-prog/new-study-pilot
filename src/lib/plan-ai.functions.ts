import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateWithFallback } from "./ai-gateway.server";
import { guardRateLimit } from "./ai-fallback.server";

const PlanInput = z.object({
  examName: z.string().min(1).max(160),
  examDate: z.string().min(4).max(40),
  daysLeft: z.number().int().min(0).max(400),
  hoursPerDay: z.number().min(0.5).max(16),
  subjects: z.array(z.string().max(160)).min(1).max(12),
  weakTopics: z.array(z.string().max(200)).max(40).default([]),
});

export const generateDayPlan = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => PlanInput.parse(raw))
  .handler(async ({ data }) => {
    guardRateLimit("plan", 10);

    const prompt = `You are an exam strategist for a B.Tech CSE (AI & ML) student in India.

Exam: ${data.examName}
Exam date: ${data.examDate}
Days left: ${data.daysLeft}
Study hours available per day: ${data.hoursPerDay}
Subjects: ${data.subjects.join(", ")}
Weak topics: ${data.weakTopics.join(", ") || "not specified"}

Build a realistic plan in Markdown (## headings, no H1):

## Today's Plan
(hour-by-hour time blocks for TODAY with exact topics, including short breaks)
## Day-wise Roadmap
(a compact table: Day | Date-ish | Subject | Topics | Goal — cover all remaining days, group days if more than 14 left)
## Priority Order
(what to do first based on weightage and weak topics)
## Daily Revision Ritual
## Last 48 Hours Strategy
## Motivation (Hinglish, 2 lines)

Keep it tight, actionable and honest about what fits in ${data.hoursPerDay} hours/day.`;

    const { text } = await generateWithFallback({ prompt });
    return { markdown: text };
  });
