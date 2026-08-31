import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { subjects } from "@/data/syllabus";

export const Route = createFileRoute("/subjects/")({
  head: () => ({
    meta: [
      { title: "Subjects — Orbit Exam Console" },
      { name: "description", content: "Browse the full B.Tech CSE (AI & ML) 5th semester syllabus by subject." },
    ],
  }),
  component: SubjectsIndex,
});

function SubjectsIndex() {
  return (
    <div className="mx-auto w-[min(96%,72rem)] px-2 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="text-xs uppercase tracking-widest text-neon">Syllabus</div>
        <h1 className="mt-2 text-4xl md:text-5xl font-display font-bold">
          B.Tech CSE (AI & ML) · <span className="text-gradient">5th Semester</span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Five subjects, twenty-five units, every official topic. Tap a subject to expand its units and open AI-generated notes.
        </p>
      </motion.div>

      <div className="mt-10 grid md:grid-cols-2 gap-5">
        {subjects.map((s, i) => (
          <motion.div
            key={s.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          >
            <Link
              to="/subjects/$slug"
              params={{ slug: s.slug }}
              className="group block glass-strong rounded-3xl p-6 hover:-translate-y-1 hover:neon-glow transition-all h-full"
            >
              <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${s.color} mb-5`} />
              <div className="flex items-baseline justify-between">
                <div className="text-xs font-mono text-muted-foreground">{s.code}</div>
                <div className="text-xs text-muted-foreground">
                  {s.units.length} units · {s.units.reduce((n, u) => n + u.topics.length, 0)} topics
                </div>
              </div>
              <h2 className="mt-1 text-2xl font-display font-semibold">{s.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.tagline}</p>
              <div className="mt-6 text-neon text-sm group-hover:translate-x-1 transition inline-block">Open subject →</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
