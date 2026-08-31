import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { subjects } from "@/data/syllabus";
import { OrbitHero } from "@/components/OrbitHero";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const totalTopics = subjects.reduce(
    (n, s) => n + s.units.reduce((m, u) => m + u.topics.length, 0),
    0,
  );

  return (
    <div className="mx-auto w-[min(96%,72rem)] px-2">
      {/* Hero */}
      <section className="relative pt-16 pb-24 text-center">
        <div className="absolute inset-0 -z-10 opacity-70 pointer-events-none">
          <OrbitHero />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse-glow" />
          Powered by AI · Built for B.Tech CSE (AI & ML) · 5th Semester
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.05]"
        >
          Your entire syllabus.
          <br />
          <span className="text-gradient">Explained by AI.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground"
        >
          Every subject, every unit, every topic — with easy, detailed and Hinglish
          explanations, interview questions, viva prep and a real-time AI tutor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/subjects"
            className="rounded-2xl bg-[image:var(--gradient-neon)] px-6 py-3 font-medium text-background neon-glow hover:scale-[1.02] transition"
          >
            Open Syllabus
          </Link>
          <Link
            to="/chat"
            className="rounded-2xl glass px-6 py-3 font-medium hover:bg-white/10 transition"
          >
            Ask AI Tutor →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-5 flex flex-wrap justify-center gap-2"
        >
          <Link
            to="/about"
            hash="about-developer"
            className="rounded-full glass px-4 py-1.5 text-xs font-medium hover:bg-white/10 transition inline-flex items-center gap-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            About the Developer
          </Link>
          <Link
            to="/about"
            hash="contact-developer"
            className="rounded-full glass px-4 py-1.5 text-xs font-medium hover:bg-white/10 transition"
          >
            Contact the Developer →
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { k: "Subjects", v: subjects.length },
            { k: "Units", v: subjects.reduce((n, s) => n + s.units.length, 0) },
            { k: "Topics", v: totalTopics },
            { k: "AI Tutor", v: "24/7" },
          ].map((s) => (
            <div key={s.k} className="glass rounded-2xl p-5">
              <div className="text-3xl md:text-4xl font-display font-bold text-gradient">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Subjects preview */}
      <section className="py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Your Subjects</h2>
            <p className="mt-2 text-muted-foreground">
              Tap into any subject to see units, topics and AI-generated notes.
            </p>
          </div>
          <Link to="/subjects" className="text-sm text-neon hover:underline hidden sm:inline">
            View all →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((s, i) => (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            >
              <Link
                to="/subjects/$slug"
                params={{ slug: s.slug }}
                className="group block h-full glass-strong rounded-3xl p-6 hover:-translate-y-1 hover:neon-glow transition-all"
              >
                <div className={`h-1 w-14 rounded-full bg-gradient-to-r ${s.color} mb-4`} />
                <div className="text-xs font-mono text-muted-foreground">{s.code}</div>
                <h3 className="mt-1 text-xl font-display font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.tagline}</p>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {s.units.length} units ·{" "}
                    {s.units.reduce((n, u) => n + u.topics.length, 0)} topics
                  </span>
                  <span className="text-neon group-hover:translate-x-1 transition">→</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center">
          Built for <span className="text-gradient">exam day</span>
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {[
            { t: "Easy + Detailed + Hinglish", d: "Every topic explained three ways so it actually clicks — beginner, textbook, and Hinglish revision." },
            { t: "Interview & Viva Ready", d: "Auto-generated interview questions, viva prep, key definitions and memory tricks per topic." },
            { t: "AI Tutor 24/7", d: "Stuck at 2 AM? Ask Orbit AI anything about your syllabus and get instant, structured answers." },
            { t: "Diagrams & Tables", d: "ASCII diagrams, comparison tables and formula sheets generated on demand." },
            { t: "Full Syllabus Loaded", d: "All 5 subjects — AI, ML, OS, IoT, Constitution — with every official unit and topic." },
            { t: "Zero Setup", d: "No installs, no accounts required for browsing. Just open and study." },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="font-display font-semibold text-lg">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="my-20">
        <div className="glass-strong rounded-3xl p-10 md:p-14 text-center neon-border">
          <h2 className="text-3xl md:text-5xl font-display font-bold">
            Ready to <span className="text-gradient">ace</span> this semester?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Open any subject and start reading AI-generated notes tailored to your syllabus.
          </p>
          <Link
            to="/subjects"
            className="inline-block mt-8 rounded-2xl bg-[image:var(--gradient-neon)] px-8 py-3.5 font-medium text-background neon-glow hover:scale-[1.02] transition"
          >
            Launch Syllabus →
          </Link>
        </div>
      </section>
    </div>
  );
}
