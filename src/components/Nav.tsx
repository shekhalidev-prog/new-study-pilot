import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

const links = [
  { to: "/", label: "Home" },
  { to: "/subjects", label: "Syllabus" },
  { to: "/chat", label: "AI Tutor" },
  { to: "/suhail", label: "Suhail AI" },
  { to: "/about", label: "Developer" },
  { to: "/admin", label: "Admin" },
] as const;

export function Nav() {
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(96%,72rem)]"
    >
      <div className="glass-strong rounded-2xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-neon)] neon-glow flex items-center justify-center font-display font-bold text-background">
            S
          </div>
          <span className="font-display font-semibold tracking-tight text-lg">
            Suhail<span className="text-gradient"> Personal AI</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              activeProps={{ className: "px-3 py-1.5 rounded-lg text-sm text-foreground bg-white/10" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/subjects"
          className="text-sm font-medium px-4 py-2 rounded-xl bg-[image:var(--gradient-neon)] text-background hover:opacity-90 transition"
        >
          Start Learning
        </Link>
      </div>
    </motion.header>
  );
}
