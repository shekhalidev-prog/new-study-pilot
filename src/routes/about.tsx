import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";


export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Developer — Suhail Personal AI" },
      { name: "description", content: "Meet Suhail Ali — the developer behind Suhail Personal AI, a B.Tech CSE (AI & ML) student building his own AI study companion." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto w-[min(96%,64rem)] px-2 py-12">
      {/* Top action bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap justify-center gap-3 mb-10"
      >
        <a
          href="#about-developer"
          className="rounded-2xl bg-[image:var(--gradient-neon)] text-background px-5 py-2.5 text-sm font-medium neon-glow hover:scale-[1.02] transition"
        >
          About the Developer
        </a>

        <a
          href="#contact-developer"
          className="rounded-2xl glass px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition"
        >
          Contact the Developer
        </a>
      </motion.div>

      {/* About */}
      <motion.section
        id="about-developer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-strong rounded-3xl p-6 md:p-10 neon-border"
      >
        <div className="grid md:grid-cols-[280px_1fr] gap-10 items-center">
          {/* Left */}
          <div className="flex justify-center md:justify-start">
            <img
              src="/developer.jpg"
              alt="Suhail Ali"
              className="w-64 h-64 object-cover rounded-2xl border border-white/20 shadow-2xl"
            />
          </div>

          {/* Right */}
          <div>
            <div className="text-xs font-mono text-neon uppercase tracking-[0.3em]">
              About the Developer
            </div>

            <h1 className="mt-3 text-4xl md:text-5xl font-display font-bold">
              <span className="text-gradient">Suhail Ali</span>
            </h1>

            <p className="mt-2 text-lg text-muted-foreground">
              B.Tech CSE — Artificial Intelligence & Machine Learning · 3rd Year
            </p>

            <p className="mt-6 text-muted-foreground leading-8">
              Hey, I'm{" "}
              <span className="text-foreground font-semibold">Suhail</span> —
              a Computer Science (AI & ML) student passionate about building
              intelligent applications that solve real-world problems.
            </p>

            <p className="mt-4 text-muted-foreground leading-8">
              I created{" "}
              <span className="text-foreground font-semibold">
                Suhail Personal AI
              </span>{" "}
              as my own AI-powered study companion. It transforms my university
              syllabus into interactive notes, explains difficult concepts in
              simple language, helps with viva preparation, and acts as a 24/7
              AI tutor.
            </p>

            <p className="mt-4 text-muted-foreground leading-8">
              Outside coding, I enjoy exploring Machine Learning research,
              designing premium user interfaces, and building products that
              people genuinely love to use.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                "AI / ML",
                "Full Stack",
                "React",
                "TypeScript",
                "Python",
                "UI / UX",
              ].map((item) => (
                <span
                  key={item}
                  className="px-4 py-2 rounded-full glass border border-white/10 text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contact */}
      <motion.section
        id="contact-developer"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-10 glass-strong rounded-3xl p-8 md:p-10 text-center"
      >
        <div className="text-xs font-mono text-neon uppercase tracking-widest">
          Contact the Developer
        </div>

        <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold">
          Let's <span className="text-gradient">Connect</span>
        </h2>

        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Got feedback, found a bug, or have a feature suggestion? Feel free to
          reach out on Instagram.
        </p>

        <a
          href="https://instagram.com/_ig_suhail_37"
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[image:var(--gradient-neon)] text-background px-6 py-3 font-medium neon-glow hover:scale-105 transition"
        >
          @_ig_suhail_37
        </a>
      </motion.section>

      {/* Navigation Cards */}
      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <Link
          to="/subjects"
          className="glass rounded-2xl p-5 hover:bg-white/10 transition"
        >
          <div className="text-neon text-sm">→</div>
          <div className="mt-1 font-display font-semibold">
            Open Syllabus
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            All subjects with AI notes
          </div>
        </Link>

        <Link
          to="/chat"
          className="glass rounded-2xl p-5 hover:bg-white/10 transition"
        >
          <div className="text-neon text-sm">→</div>
          <div className="mt-1 font-display font-semibold">AI Tutor</div>
          <div className="text-sm text-muted-foreground mt-1">
            Ask anything, 24/7
          </div>
        </Link>

        <Link
          to="/"
          className="glass rounded-2xl p-5 hover:bg-white/10 transition"
        >
          <div className="text-neon text-sm">→</div>
          <div className="mt-1 font-display font-semibold">Back Home</div>
          <div className="text-sm text-muted-foreground mt-1">
            Return to landing page
          </div>
        </Link>
      </div>
    </div>
  );
}