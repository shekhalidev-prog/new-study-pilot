import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type State = "idle" | "listening" | "thinking" | "speaking";

export function SuhailAvatar({
  state,
  amplitude,
  size = 260,
}: {
  state: State;
  amplitude?: () => number;
  size?: number;
}) {
  const [mouth, setMouth] = useState(0);
  const [blink, setBlink] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (state !== "speaking" || !amplitude) {
      setMouth(0);
      return;
    }
    const tick = () => {
      setMouth(amplitude());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [state, amplitude]);

  useEffect(() => {
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 2500 + Math.random() * 2500));
        if (cancelled) break;
        setBlink(true);
        await new Promise((r) => setTimeout(r, 120));
        setBlink(false);
      }
    };
    loop();
    return () => { cancelled = true; };
  }, []);

  const mouthOpen = 2 + mouth * 14;
  const eyeH = blink ? 1 : 6;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* holographic rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.25), transparent 65%)",
          filter: "blur(20px)",
        }}
        animate={{ scale: state === "speaking" ? [1, 1.08, 1] : [1, 1.04, 1] }}
        transition={{ duration: state === "speaking" ? 0.6 : 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-2 rounded-full border border-cyan-400/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={{ boxShadow: "0 0 40px rgba(34,211,238,0.35), inset 0 0 30px rgba(139,92,246,0.25)" }}
      />
      <motion.div
        className="absolute inset-6 rounded-full border border-violet-400/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {state === "listening" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-300"
          animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      {state === "thinking" && (
        <motion.div
          className="absolute left-1/2 -top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-300"
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ boxShadow: "0 0 12px rgba(34,211,238,0.9)" }}
        />
      )}

      {/* character */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fef3c7" />
            <stop offset="1" stopColor="#fcd5b5" />
          </linearGradient>
          <radialGradient id="eyeGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#0ea5e9" />
          </radialGradient>
          <linearGradient id="jacket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e293b" />
            <stop offset="1" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* back hair */}
        <path
          d="M55 90 Q50 40 100 30 Q150 40 145 95 L150 130 L135 120 L130 85 Q120 60 100 60 Q80 60 70 85 L65 120 L50 130 Z"
          fill="url(#hair)"
          opacity="0.9"
        />
        {/* neck */}
        <rect x="90" y="130" width="20" height="18" fill="url(#face)" />
        {/* jacket */}
        <path d="M60 150 Q100 138 140 150 L150 190 L50 190 Z" fill="url(#jacket)" />
        <path d="M97 150 L100 190 L103 150 Z" fill="#22d3ee" opacity="0.85" />
        <circle cx="100" cy="165" r="2" fill="#67e8f9" />
        <circle cx="100" cy="175" r="2" fill="#67e8f9" />

        {/* face */}
        <ellipse cx="100" cy="100" rx="34" ry="40" fill="url(#face)" />
        {/* cheeks */}
        <ellipse cx="82" cy="112" rx="5" ry="3" fill="#fca5a5" opacity="0.55" />
        <ellipse cx="118" cy="112" rx="5" ry="3" fill="#fca5a5" opacity="0.55" />

        {/* front hair */}
        <path
          d="M66 88 Q70 55 100 52 Q132 55 134 88 Q120 72 110 82 Q100 68 90 82 Q78 72 66 88 Z"
          fill="url(#hair)"
        />
        <path d="M92 55 L88 78 L96 70 Z" fill="#a5f3fc" opacity="0.7" />

        {/* eyes */}
        <g>
          <ellipse cx="86" cy="102" rx="7" ry={eyeH} fill="url(#eyeGrad)" />
          <ellipse cx="114" cy="102" rx="7" ry={eyeH} fill="url(#eyeGrad)" />
          {!blink && (
            <>
              <circle cx="88" cy="100" r="1.6" fill="#fff" />
              <circle cx="116" cy="100" r="1.6" fill="#fff" />
            </>
          )}
        </g>
        {/* eyebrows */}
        <path d="M78 92 Q86 89 94 92" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M106 92 Q114 89 122 92" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* nose */}
        <path d="M100 108 L98 116 L102 116 Z" fill="#f59e0b" opacity="0.3" />

        {/* mouth (animated) */}
        <motion.ellipse
          cx="100"
          cy="124"
          rx={5 + mouth * 4}
          ry={mouthOpen}
          fill="#0f172a"
          animate={{ ry: mouthOpen }}
          transition={{ duration: 0.05 }}
        />
        <path d="M95 122 Q100 120 105 122" stroke="#f472b6" strokeWidth="1" fill="none" />

        {/* glowing tech marks */}
        <circle cx="70" cy="100" r="1.5" fill="#22d3ee" opacity="0.8" />
        <circle cx="130" cy="100" r="1.5" fill="#22d3ee" opacity="0.8" />
        <path d="M60 80 L64 84" stroke="#22d3ee" strokeWidth="1" opacity="0.7" />
        <path d="M140 80 L136 84" stroke="#22d3ee" strokeWidth="1" opacity="0.7" />
      </motion.svg>
    </div>
  );
}
