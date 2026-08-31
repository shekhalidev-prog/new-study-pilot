import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { findTopic, type Subject, type Unit, type Topic } from "@/data/syllabus";
import { generateTopicContent } from "@/lib/topic-ai.functions";
import { Markdown } from "@/components/Markdown";

type LoaderData = { subject: Subject; unit: Unit; topic: Topic };

export const Route = createFileRoute("/topic/$subject/$unit/$topic")({
  loader: ({ params }): LoaderData => {
    const data = findTopic(params.subject, params.unit, params.topic);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.topic.name} — ${loaderData.subject.name} — Orbit` },
          {
            name: "description",
            content: `AI-generated notes for ${loaderData.topic.name} (${loaderData.subject.name}, Unit ${loaderData.unit.romanNumeral}).`,
          },
        ]
      : [{ title: "Topic — Orbit" }],
  }),
  component: TopicPage,
  notFoundComponent: () => (
    <div className="mx-auto w-[min(96%,60rem)] px-2 py-20 text-center">
      <h1 className="text-3xl font-display font-bold">Topic not found</h1>
      <Link to="/subjects" className="mt-4 inline-block text-neon">← Back to subjects</Link>
    </div>
  ),
});

const cacheKey = (s: string, u: string, t: string) => `orbit:topic:${s}:${u}:${t}`;

function TopicPage() {
  const { subject, unit, topic } = Route.useLoaderData();
  const generate = useServerFn(generateTopicContent);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await generate({
        data: {
          subject: subject.name,
          unit: `Unit ${unit.romanNumeral}: ${unit.title}`,
          topic: topic.name,
        },
      });
      try {
        localStorage.setItem(cacheKey(subject.slug, unit.id, topic.slug), res.markdown);
      } catch {}
      return res.markdown;
    },
    onSuccess: (md) => setMarkdown(md),
  });

  useEffect(() => {
    const key = cacheKey(subject.slug, unit.id, topic.slug);
    let cached: string | null = null;
    try { cached = localStorage.getItem(key); } catch {}
    if (cached) {
      setMarkdown(cached);
    } else {
      setMarkdown(null);
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.slug, unit.id, topic.slug]);

  const topicIndex = unit.topics.findIndex((t: Topic) => t.slug === topic.slug);
  const prev = topicIndex > 0 ? unit.topics[topicIndex - 1] : null;
  const next = topicIndex < unit.topics.length - 1 ? unit.topics[topicIndex + 1] : null;

  const regenerate = () => {
    try { localStorage.removeItem(cacheKey(subject.slug, unit.id, topic.slug)); } catch {}
    setMarkdown(null);
    mutation.mutate();
  };

  return (
    <div className="mx-auto w-[min(96%,60rem)] px-2 py-8">
      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
        <Link to="/subjects" className="hover:text-neon">Syllabus</Link>
        <span>/</span>
        <Link to="/subjects/$slug" params={{ slug: subject.slug }} className="hover:text-neon">
          {subject.name}
        </Link>
        <span>/</span>
        <span>Unit {unit.romanNumeral}</span>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4 glass-strong rounded-3xl p-8"
      >
        <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${subject.color} mb-4`} />
        <div className="text-xs font-mono text-muted-foreground">
          {subject.code} · Unit {unit.romanNumeral} — {unit.title}
        </div>
        <h1 className="mt-1 text-3xl md:text-4xl font-display font-bold">{topic.name}</h1>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={regenerate}
            disabled={mutation.isPending}
            className="text-sm rounded-xl bg-[image:var(--gradient-neon)] text-background px-4 py-2 font-medium disabled:opacity-50 hover:scale-[1.02] transition"
          >
            {mutation.isPending ? "Generating…" : "Regenerate with AI"}
          </button>
          <Link
            to="/chat"
            className="text-sm rounded-xl glass px-4 py-2 hover:bg-white/10 transition"
          >
            Ask AI Tutor →
          </Link>
        </div>
      </motion.header>

      <section className="mt-8 glass rounded-3xl p-6 md:p-10 min-h-[300px]">
        {mutation.isPending && !markdown && <LoadingSkeleton />}
        {mutation.isError && (
          <div className="text-destructive">
            Failed to generate: {(mutation.error as Error).message}. Please try again.
          </div>
        )}
        {markdown && <Markdown>{markdown}</Markdown>}
      </section>

      <nav className="mt-8 flex gap-3">
        {prev ? (
          <Link
            to="/topic/$subject/$unit/$topic"
            params={{ subject: subject.slug, unit: unit.id, topic: prev.slug }}
            className="flex-1 glass rounded-2xl p-4 hover:bg-white/10 transition"
          >
            <div className="text-xs text-muted-foreground">← Previous topic</div>
            <div className="mt-1 font-medium">{prev.name}</div>
          </Link>
        ) : <div className="flex-1" />}
        {next ? (
          <Link
            to="/topic/$subject/$unit/$topic"
            params={{ subject: subject.slug, unit: unit.id, topic: next.slug }}
            className="flex-1 glass rounded-2xl p-4 hover:bg-white/10 transition text-right"
          >
            <div className="text-xs text-muted-foreground">Next topic →</div>
            <div className="mt-1 font-medium">{next.name}</div>
          </Link>
        ) : <div className="flex-1" />}
      </nav>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-neon">
        <span className="inline-block h-2 w-2 rounded-full bg-neon animate-pulse-glow" />
        Orbit AI is writing your notes…
      </div>
      {[80, 95, 70, 88, 60, 92, 75].map((w, i) => (
        <div
          key={i}
          className="h-3 rounded-full bg-white/5 animate-pulse"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}
