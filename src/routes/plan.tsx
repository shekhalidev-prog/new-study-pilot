import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { subjects } from "@/data/syllabus";
import { Markdown } from "@/components/Markdown";
import { CircularProgress } from "@/components/CircularProgress";
import { generateDayPlan } from "@/lib/plan-ai.functions";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Exam Countdown + AI Day Plan — Suhail Personal AI" },
      {
        name: "description",
        content:
          "Live exam countdown with an AI-generated hour-by-hour study plan and day-wise roadmap for your B.Tech AI/ML exams.",
      },
      { property: "og:title", content: "Exam Countdown + AI Day Plan" },
      {
        property: "og:description",
        content: "Set your exam date and let AI build today's schedule and a day-wise roadmap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

const STORE = "suhail-exam-plan";

type Saved = {
  examName: string;
  examDate: string;
  hoursPerDay: number;
  picked: string[];
  weak: string;
  startedAt: string;
  markdown: string;
};

const DAY = 86400000;

function PlanPage() {
  const [examName, setExamName] = useState("End Semester Exam");
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [picked, setPicked] = useState<string[]>([]);
  const [weak, setWeak] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      try {
        const s = JSON.parse(raw) as Saved;
        setExamName(s.examName || "End Semester Exam");
        setExamDate(s.examDate || "");
        setHoursPerDay(s.hoursPerDay || 4);
        setPicked(s.picked ?? []);
        setWeak(s.weak ?? "");
        setMarkdown(s.markdown ?? "");
        setStartedAt(s.startedAt ?? "");
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const save = (patch: Partial<Saved>) => {
    const next: Saved = {
      examName,
      examDate,
      hoursPerDay,
      picked,
      weak,
      startedAt,
      markdown,
      ...patch,
    };
    localStorage.setItem(STORE, JSON.stringify(next));
  };

  const target = useMemo(
    () => (examDate ? new Date(`${examDate}T09:00:00`).getTime() : 0),
    [examDate],
  );
  const diff = target ? Math.max(0, target - now) : 0;
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const totalSpan = startedAt && target ? target - new Date(startedAt).getTime() : 0;
  const progress =
    totalSpan > 0 ? Math.min(100, Math.max(0, ((totalSpan - diff) / totalSpan) * 100)) : 0;

  const run = useServerFn(generateDayPlan);
  const planM = useMutation({
    mutationFn: () =>
      run({
        data: {
          examName,
          examDate,
          daysLeft: Math.min(days, 400),
          hoursPerDay,
          subjects: picked.length ? picked : subjects.map((s) => s.name),
          weakTopics: weak
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean)
            .slice(0, 40),
        },
      }),
    onSuccess: (r) => {
      setMarkdown(r.markdown);
      const started = startedAt || new Date().toISOString();
      setStartedAt(started);
      save({ markdown: r.markdown, startedAt: started });
    },
  });

  const toggle = (name: string) =>
    setPicked((p) => {
      const next = p.includes(name) ? p.filter((x) => x !== name) : [...p, name];
      save({ picked: next });
      return next;
    });

  return (
    <div className="mx-auto w-[min(96%,64rem)] px-2 py-10">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-neon">Exam Countdown</div>
        <h1 className="mt-2 text-3xl md:text-5xl font-display font-bold">
          Countdown + <span className="text-gradient">AI Day Plan</span>
        </h1>
        <p className="mt-3 text-muted-foreground text-sm md:text-base">
          Exam date set karo — AI aaj ka hour-by-hour plan aur pura roadmap bana dega.
        </p>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-5 items-center glass-strong rounded-2xl p-5 md:p-7 mt-8">
        <div className="flex justify-center">
          <CircularProgress value={Math.round(progress)} label={days ? `${days}d` : "Today"} />
        </div>
        <div>
          {examDate ? (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { v: days, l: "Days" },
                { v: hours, l: "Hours" },
                { v: mins, l: "Min" },
                { v: secs, l: "Sec" },
              ].map((x) => (
                <div key={x.l} className="glass rounded-xl py-3">
                  <div className="text-2xl md:text-3xl font-display font-bold text-gradient">
                    {String(x.v).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {x.l}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Neeche exam date choose karo aur countdown live ho jayega.
            </p>
          )}
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <label className="text-xs text-muted-foreground">
              Exam name
              <input
                value={examName}
                onChange={(e) => {
                  setExamName(e.target.value);
                  save({ examName: e.target.value });
                }}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-neon/60"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Exam date
              <input
                type="date"
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  save({ examDate: e.target.value });
                }}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-neon/60"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Study hours / day: <span className="text-foreground">{hoursPerDay}h</span>
              <input
                type="range"
                min={1}
                max={14}
                step={0.5}
                value={hoursPerDay}
                onChange={(e) => {
                  setHoursPerDay(Number(e.target.value));
                  save({ hoursPerDay: Number(e.target.value) });
                }}
                className="mt-3 w-full accent-neon"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-5 mt-5">
        <div className="text-sm font-medium">Subjects in this exam</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {subjects.map((s) => {
            const on = picked.includes(s.name);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggle(s.name)}
                className={`px-3 py-1.5 rounded-xl text-xs border transition ${
                  on
                    ? "bg-[image:var(--gradient-neon)] text-background border-transparent"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        <label className="block mt-4 text-xs text-muted-foreground">
          Weak topics (comma separated)
          <input
            value={weak}
            onChange={(e) => {
              setWeak(e.target.value);
              save({ weak: e.target.value });
            }}
            placeholder="Deadlock, Bayes theorem, MQTT…"
            className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-foreground outline-none focus:border-neon/60"
          />
        </label>
        <button
          type="button"
          disabled={!examDate || planM.isPending}
          onClick={() => planM.mutate()}
          className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[image:var(--gradient-neon)] text-background text-sm font-semibold disabled:opacity-40"
        >
          {planM.isPending ? "Planning…" : "🗓️ Generate AI day plan"}
        </button>
        {planM.error && (
          <p className="mt-2 text-xs text-red-400">{(planM.error as Error).message}</p>
        )}
      </div>

      <AnimatePresence>
        {markdown && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-4 md:p-6 mt-5"
          >
            <Markdown>{markdown}</Markdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
