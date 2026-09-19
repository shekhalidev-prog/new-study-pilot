import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/subjects", label: "Syllabus" },
  { to: "/revision", label: "Revision" },
  { to: "/chat", label: "AI Tutor" },
  { to: "/suhail", label: "Suhail AI" },
  { to: "/clone", label: "Study Clone" },
  { to: "/plan", label: "Exam Plan" },
  { to: "/about", label: "Developer" },
  { to: "/admin", label: "Admin" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(96%,72rem)]"
    >
      <div className="glass-strong rounded-2xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-neon)] neon-glow flex items-center justify-center font-display font-bold text-background">
            S
          </div>
          <span className="font-display font-semibold tracking-tight text-base sm:text-lg">
            Suhail<span className="text-gradient"> Personal AI</span>
          </span>
        </Link>
        <nav className="hidden xl:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              activeProps={{
                className:
                  "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap text-foreground bg-white/10",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/subjects"
            className="hidden sm:inline-flex whitespace-nowrap text-sm font-medium px-4 py-2 rounded-xl bg-[image:var(--gradient-neon)] text-background hover:opacity-90 transition"
          >
            Start Learning
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="xl:hidden h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="xl:hidden mt-2 glass-strong rounded-2xl p-2 grid gap-1"
          >
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                activeProps={{
                  className: "px-3 py-2.5 rounded-xl text-sm text-foreground bg-white/10",
                }}
              >
                {l.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
