import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subjects } from "@/data/syllabus";
import { Markdown } from "@/components/Markdown";
import { CircularProgress } from "@/components/CircularProgress";
import {
  generateRevision,
  generateRevisionQuiz,
  generatePredictedQuestions,
  type QuizQuestion,
} from "@/lib/revision-ai.functions";
import { loadSessions, saveSession, stats, type RevisionSession } from "@/lib/revision-storage";
import { VivaSimulator } from "@/components/VivaSimulator";

export const Route = createFileRoute("/revision")({
  head: () => ({
    meta: [
      { title: "Smart Revision Mode — Suhail Personal AI" },
      {
        name: "description",
        content:
          "Timed AI revision sheets for AI, ML, OS, IoT and Constitution of India, with a 10-question practice test and performance tracking.",
      },
      { property: "og:title", content: "Smart Revision Mode — Suhail Personal AI" },
      {
        property: "og:description",
        content:
          "Pick a subject, chapter and time budget. Get an exam-focused revision sheet plus an instant MCQ test.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevisionPage,
});

const DURATIONS = [
  { minutes: 5 as const, emoji: "⚡", label: "5 Minutes", note: "Flash recall" },
  { minutes: 15 as const, emoji: "🚀", label: "15 Minutes", note: "Quick sweep" },
  { minutes: 30 as const, emoji: "📚", label: "30 Minutes", note: "Solid revision" },
  { minutes: 60 as const, emoji: "🎯", label: "60 Minutes", note: "Exam-day deep dive" },
];

const ORDER = [
  "artificial-intelligence",
  "internet-of-things",
  "machine-learning",
  "operating-system",
  "constitution-of-india",
];

const revisionSubjects = ORDER.map((s) => subjects.find((x) => x.slug === s)!).filter(Boolean);

function RevisionPage() {
  const [subjectSlug, setSubjectSlug] = useState(revisionSubjects[0]?.slug ?? "");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<5 | 15 | 30 | 60>(15);
  const [sessions, setSessions] = useState<RevisionSession[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => setSessions(loadSessions()), []);

  const subject = revisionSubjects.find((s) => s.slug === subjectSlug) ?? revisionSubjects[0];
  const unit = subject?.units.find((u) => u.id === unitId) ?? null;

  const runRevision = useServerFn(generateRevision);
  const runQuiz = useServerFn(generateRevisionQuiz);

  const revision = useMutation({
    mutationFn: async () => {
      if (!subject || !unit) throw new Error("Pick a chapter first");
      return runRevision({
        data: {
          subject: subject.name,
          unit: `Unit ${unit.romanNumeral} — ${unit.title}`,
          topics: unit.topics.map((t) => t.name),
          minutes,
        },
      });
    },
    onSuccess: () => {
      if (!subject || !unit) return;
      const s: RevisionSession = {
        subjectSlug: subject.slug,
        subjectName: subject.name,
        unitId: unit.id,
        unitTitle: unit.title,
        minutes,
        score: null,
        total: null,
        weakTopics: [],
        date: new Date().toISOString(),
      };
      saveSession(s);
      setSessions(loadSessions());
    },
  });

  const quizGen = useMutation({
    mutationFn: async () => {
      if (!subject || !unit) throw new Error("Pick a chapter first");
      return runQuiz({
        data: {
          subject: subject.name,
          unit: `Unit ${unit.romanNumeral} — ${unit.title}`,
          topics: unit.topics.map((t) => t.name),
        },
      });
    },
    onSuccess: (res) => {
      setQuiz(res.questions);
      setAnswers({});
      setSubmitted(false);
    },
  });

  const runPredict = useServerFn(generatePredictedQuestions);
  const predicted = useMutation({
    mutationFn: async () => {
      if (!subject || !unit) throw new Error("Pick a chapter first");
      let pyqs: { title: string; year: string; notes: string }[] = [];
      try {
        const raw = JSON.parse(localStorage.getItem("suhail-admin-pyqs") ?? "[]") as Array<{
          title?: string;
          subject?: string;
          year?: string;
          notes?: string;
        }>;
        pyqs = raw
          .filter((p) => !p.subject || p.subject === subject.name)
          .slice(0, 40)
          .map((p) => ({
            title: String(p.title ?? "").slice(0, 300),
            year: String(p.year ?? "").slice(0, 20),
            notes: String(p.notes ?? "").slice(0, 2000),
          }))
          .filter((p) => p.title);
      } catch {
        pyqs = [];
      }
      return runPredict({
        data: {
          subject: subject.name,
          unit: `Unit ${unit.romanNumeral} — ${unit.title}`,
          topics: unit.topics.map((t) => t.name),
          pyqs,
        },
      });
    },
  });

  const score = useMemo(
    () => (quiz ?? []).reduce((n, q, i) => n + (answers[i] === q.answerIndex ? 1 : 0), 0),
    [quiz, answers],
  );
  const accuracy = quiz?.length ? Math.round((score / quiz.length) * 100) : 0;
  const weakTopics = useMemo(
    () =>
      Array.from(
        new Set((quiz ?? []).filter((q, i) => answers[i] !== q.answerIndex).map((q) => q.topic)),
      ).slice(0, 6),
    [quiz, answers],
  );

  const overall = stats(sessions);

  const nextChapter = useMemo(() => {
    if (!subject || !unit) return null;
    const idx = subject.units.findIndex((u) => u.id === unit.id);
    return subject.units[idx + 1] ?? null;
  }, [subject, unit]);

  function submitQuiz() {
    if (!quiz || !subject || !unit) return;
    setSubmitted(true);
    saveSession({
      subjectSlug: subject.slug,
      subjectName: subject.name,
      unitId: unit.id,
      unitTitle: unit.title,
      minutes: 0,
      score,
      total: quiz.length,
      weakTopics,
      date: new Date().toISOString(),
    });
    setSessions(loadSessions());
  }

  return (
    <div className="mx-auto w-[min(96%,72rem)] px-2 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-xs uppercase tracking-widest text-neon">Smart Revision Mode</div>
        <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold">
          Revise smart, <span className="text-gradient">not long</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Pick a subject, a chapter and how much time you have. The AI compresses the syllabus into
          an exam-focused revision sheet — then tests you on it.
        </p>
      </motion.div>

      {/* Step 1 — subject */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">1 · Subject</h2>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {revisionSubjects.map((s) => (
            <button
              key={s.slug}
              onClick={() => {
                setSubjectSlug(s.slug);
                setUnitId(null);
                setQuiz(null);
                revision.reset();
              }}
              className={`glass rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 ${
                s.slug === subjectSlug ? "ring-1 ring-neon neon-glow" : "hover:bg-white/5"
              }`}
            >
              <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${s.color} mb-3`} />
              <div className="font-display font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.units.length} chapters</div>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2 — chapter */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">2 · Chapter</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          {subject?.units.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setUnitId(u.id);
                setQuiz(null);
                revision.reset();
              }}
              className={`glass rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 ${
                u.id === unitId ? "ring-1 ring-neon neon-glow" : "hover:bg-white/5"
              }`}
            >
              <div className="text-xs font-mono text-neon">Unit {u.romanNumeral}</div>
              <div className="font-display font-semibold mt-0.5">{u.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{u.topics.length} topics</div>
            </button>
          ))}
        </div>
      </section>

      {/* Step 3 — duration */}
      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
          3 · Time available
        </h2>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.minutes}
              onClick={() => setMinutes(d.minutes)}
              className={`glass rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 ${
                d.minutes === minutes ? "ring-1 ring-neon neon-glow" : "hover:bg-white/5"
              }`}
            >
              <div className="text-2xl">{d.emoji}</div>
              <div className="font-display font-semibold mt-1">{d.label}</div>
              <div className="text-xs text-muted-foreground">{d.note}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          disabled={!unit || revision.isPending}
          onClick={() => revision.mutate()}
          className="px-5 py-3 rounded-xl bg-[image:var(--gradient-neon)] text-background font-medium disabled:opacity-40 hover:opacity-90 transition"
        >
          {revision.isPending ? "Generating revision…" : "Generate revision sheet"}
        </button>
        {revision.data ? (
          <button
            disabled={quizGen.isPending}
            onClick={() => quizGen.mutate()}
            className="px-5 py-3 rounded-xl glass-strong font-medium disabled:opacity-40 hover:bg-white/5 transition"
          >
            {quizGen.isPending ? "Building test…" : "Take quick practice test"}
          </button>
        ) : null}
        <button
          disabled={!unit || predicted.isPending}
          onClick={() => predicted.mutate()}
          className="px-5 py-3 rounded-xl glass-strong font-medium disabled:opacity-40 hover:bg-white/5 transition"
        >
          {predicted.isPending ? "Analysing papers…" : "🔮 AI predicted exam questions"}
        </button>
      </div>

      {revision.isError ? (
        <p className="mt-4 text-sm text-red-400">Could not generate revision. Please try again.</p>
      ) : null}
      {predicted.isError ? (
        <p className="mt-4 text-sm text-red-400">Could not predict questions. Please try again.</p>
      ) : null}

      {subject ? (
        <VivaSimulator
          subject={subject.name}
          unit={unit ? `Unit ${unit.romanNumeral} — ${unit.title}` : ""}
          topics={unit?.topics.map((t) => t.name) ?? []}
          disabled={!unit}
        />
      ) : null}

      <AnimatePresence>
        {predicted.data ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass-strong rounded-3xl p-6"
          >
            <div className="text-xs uppercase tracking-widest text-neon">Predicted paper</div>
            <h2 className="font-display text-2xl font-semibold">
              🔮 AI predicted exam questions · {subject?.name} Unit {unit?.romanNumeral}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Based on the syllabus and previous year papers saved in the admin panel.
            </p>
            <div className="mt-6">
              <Markdown>{predicted.data.markdown}</Markdown>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {revision.data ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass-strong rounded-3xl p-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs uppercase tracking-widest text-neon">
                  {minutes}-minute revision
                </div>
                <h2 className="font-display text-2xl font-semibold">
                  {subject?.name} · Unit {unit?.romanNumeral}
                </h2>
              </div>
            </div>
            <div className="mt-6">
              <Markdown>{revision.data.markdown}</Markdown>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* Quiz */}
      {quizGen.isError ? (
        <p className="mt-4 text-sm text-red-400">Could not build the test. Please try again.</p>
      ) : null}

      {quiz && quiz.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass-strong rounded-3xl p-6"
        >
          <h2 className="font-display text-2xl font-semibold">Quick practice test</h2>
          <p className="text-sm text-muted-foreground mt-1">10 questions · instant checking</p>

          <div className="mt-6 space-y-5">
            {quiz.map((q, i) => (
              <div key={i} className="glass rounded-2xl p-4">
                <div className="font-medium">
                  <span className="text-neon font-mono mr-2">{i + 1}.</span>
                  {q.question}
                </div>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt, oi) => {
                    const picked = answers[i] === oi;
                    const correct = submitted && oi === q.answerIndex;
                    const wrong = submitted && picked && oi !== q.answerIndex;
                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        className={`text-left text-sm px-3 py-2 rounded-xl border transition ${
                          correct
                            ? "border-emerald-400/60 bg-emerald-400/10"
                            : wrong
                              ? "border-red-400/60 bg-red-400/10"
                              : picked
                                ? "border-neon bg-white/5"
                                : "border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="text-neon">Why: </span>
                    {q.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {!submitted ? (
            <button
              onClick={submitQuiz}
              disabled={Object.keys(answers).length === 0}
              className="mt-6 px-5 py-3 rounded-xl bg-[image:var(--gradient-neon)] text-background font-medium disabled:opacity-40"
            >
              Submit &amp; check answers
            </button>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <CircularProgress
                value={accuracy}
                label={`${score}/${quiz.length}`}
                sublabel="score"
              />
              <CircularProgress value={accuracy} sublabel="accuracy" />
              <div className="text-sm text-muted-foreground max-w-sm">
                {accuracy >= 80
                  ? "Excellent — this chapter is exam-ready. Move to the next one."
                  : accuracy >= 50
                    ? "Decent. Re-read the weak topics below, then retake the test."
                    : "Needs work. Revise this chapter again before moving forward."}
              </div>
            </div>
          )}

          {submitted ? (
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="glass rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neon">Weak topics</div>
                <ul className="mt-2 text-sm space-y-1 text-muted-foreground">
                  {weakTopics.length ? (
                    weakTopics.map((t) => <li key={t}>• {t}</li>)
                  ) : (
                    <li>None — clean sweep 🎉</li>
                  )}
                </ul>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neon">Revise again</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {accuracy >= 80
                    ? "Nothing urgent in this chapter."
                    : `Unit ${unit?.romanNumeral} — ${unit?.title} (try the ${minutes === 5 ? 15 : 30}-minute mode).`}
                </p>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neon">Recommended next</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {nextChapter
                    ? `Unit ${nextChapter.romanNumeral} — ${nextChapter.title}`
                    : "You've reached the last chapter of this subject. Pick another subject."}
                </p>
              </div>
            </div>
          ) : null}
        </motion.section>
      ) : null}

      {/* Performance */}
      <section className="mt-10 glass-strong rounded-3xl p-6">
        <h2 className="font-display text-2xl font-semibold">AI performance</h2>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Revision time" value={`${overall.totalMinutes} min`} />
          <Stat label="Chapters revised" value={String(overall.chaptersRevised)} />
          <Stat label="Quizzes taken" value={String(overall.quizzesTaken)} />
          <Stat label="Accuracy" value={`${overall.accuracy}%`} />
          <Stat
            label="Last revision"
            value={overall.lastRevision ? new Date(overall.lastRevision).toLocaleDateString() : "—"}
          />
        </div>
        {sessions.length ? (
          <div className="mt-6 flex items-center gap-6 flex-wrap">
            <CircularProgress value={overall.accuracy} sublabel="overall" />
            <ul className="text-sm text-muted-foreground space-y-1">
              {sessions.slice(0, 4).map((s, i) => (
                <li key={i}>
                  <span className="text-foreground">{s.subjectName}</span> · {s.unitTitle}
                  {s.score !== null ? ` · ${s.score}/${s.total}` : ` · ${s.minutes} min`} ·{" "}
                  {new Date(s.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No revision yet — generate your first sheet above.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
