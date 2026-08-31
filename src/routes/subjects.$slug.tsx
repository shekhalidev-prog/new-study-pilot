import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { findSubject, type Subject, type Unit, type Topic } from "@/data/syllabus";

export const Route = createFileRoute("/subjects/$slug")({
  loader: ({ params }): { subject: Subject } => {
    const subject = findSubject(params.slug);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.subject.name} — Orbit Exam Console` },
          {
            name: "description",
            content: `${loaderData.subject.name} (${loaderData.subject.code}) — ${loaderData.subject.tagline}. Full syllabus with AI notes.`,
          },
        ]
      : [{ title: "Subject — Orbit Exam Console" }],
  }),
  component: SubjectPage,
  notFoundComponent: () => (
    <div className="mx-auto w-[min(96%,60rem)] px-2 py-20 text-center">
      <h1 className="text-3xl font-display font-bold">Subject not found</h1>
      <Link to="/subjects" className="mt-4 inline-block text-neon">← Back to subjects</Link>
    </div>
  ),
});

function SubjectPage() {
  const { subject } = Route.useLoaderData();
  const [openUnit, setOpenUnit] = useState<string | null>(subject.units[0]?.id ?? null);

  return (
    <div className="mx-auto w-[min(96%,68rem)] px-2 py-10">
      <Link to="/subjects" className="text-sm text-muted-foreground hover:text-neon">
        ← All subjects
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4 glass-strong rounded-3xl p-8"
      >
        <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${subject.color} mb-4`} />
        <div className="text-xs font-mono text-muted-foreground">{subject.code}</div>
        <h1 className="mt-1 text-4xl md:text-5xl font-display font-bold">{subject.name}</h1>
        <p className="mt-3 text-muted-foreground">{subject.tagline}</p>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-neon mb-2">Course Outcomes</div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {subject.outcomes.map((o: string, i: number) => (
                <li key={i} className="flex gap-2">
                  <span className="text-neon">CO{i + 1}.</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-neon mb-2">Reference Books</div>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5 marker:text-neon">
              {subject.textbooks.map((b: string, i: number) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        </div>
      </motion.header>

      <section className="mt-8 space-y-3">
        {subject.units.map((u: Unit, ui: number) => {
          const isOpen = openUnit === u.id;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: ui * 0.04 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenUnit(isOpen ? null : u.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-neon)] flex items-center justify-center text-background font-display font-bold">
                    {u.romanNumeral}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Unit {u.romanNumeral}</div>
                    <div className="font-display font-semibold text-lg">{u.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{u.topics.length} topics</span>
                  <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </div>
              </button>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-white/5"
                >
                  <div className="p-4 grid sm:grid-cols-2 gap-2">
                    {u.topics.map((t: Topic) => (
                      <Link
                        key={t.slug}
                        to="/topic/$subject/$unit/$topic"
                        params={{ subject: subject.slug, unit: u.id, topic: t.slug }}
                        className="group flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5 border border-transparent hover:border-white/10 transition"
                      >
                        <span className="text-sm">{t.name}</span>
                        <span className="text-neon opacity-0 group-hover:opacity-100 transition">→</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
