import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function BootIntro() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("suhail-booted") === "1") return;
    setShow(true);
    const start = performance.now();
    const dur = 3200;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / dur);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        sessionStorage.setItem("suhail-booted", "1");
        setTimeout(() => setShow(false), 400);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(20px)" }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
        >
          {/* Background orbit rings */}
          <div className="absolute inset-0 flex items-center justify-center [perspective:1200px]">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{
                  width: `${28 + i * 16}rem`,
                  height: `${28 + i * 16}rem`,
                  borderColor: `oklch(0.72 0.25 305 / ${0.5 - i * 0.1})`,
                  transformStyle: "preserve-3d",
                  boxShadow: `0 0 60px -10px oklch(0.72 0.25 305 / ${0.4 - i * 0.08})`,
                }}
                animate={{ rotateX: [60, 60], rotateZ: [0, 360] }}
                transition={{ duration: 12 - i * 2, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </div>

          {/* Center content */}
          <div className="relative z-10 text-center px-6 max-w-md">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-[image:var(--gradient-neon)] flex items-center justify-center text-3xl font-display font-bold text-background neon-glow"
            >
              S
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xs uppercase tracking-[0.4em] text-neon font-mono"
            >
              Booting Personal AI
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="mt-3 text-3xl md:text-4xl font-display font-bold"
            >
              Hi, I'm <span className="text-gradient">Suhail Ali</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.7 }}
              className="mt-3 text-sm text-muted-foreground"
            >
              B.Tech CSE (AI & ML) · Builder of this personal AI study universe.
              <br />
              Sit back — your syllabus is entering orbit.
            </motion.p>

            {/* Progress bar */}
            <div className="mt-8 mx-auto w-64 h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-[image:var(--gradient-neon)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] font-mono text-muted-foreground tracking-widest">
              {progress < 0.3 && "INIT · loading syllabus modules"}
              {progress >= 0.3 && progress < 0.7 && "SYNC · warming AI tutor"}
              {progress >= 0.7 && "READY · entering orbit"}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
