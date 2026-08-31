import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function SuhailFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/suhail")) return null;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-5 right-5 z-40"
    >
      <Link
        to="/suhail"
        className="group relative flex h-16 w-16 items-center justify-center rounded-full"
        aria-label="Open Suhail AI assistant"
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.6), transparent 70%)", filter: "blur(10px)" }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{
            background: "linear-gradient(135deg,#22d3ee,#8b5cf6)",
            boxShadow: "0 0 30px rgba(34,211,238,0.55), 0 0 60px rgba(139,92,246,0.35)",
          }}
        >
          🤖
        </span>
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg glass px-2.5 py-1 text-xs opacity-0 group-hover:opacity-100 transition">
          Suhail AI
        </span>
      </Link>
    </motion.div>
  );
}
