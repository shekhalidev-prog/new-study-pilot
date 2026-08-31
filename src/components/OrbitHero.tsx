import { motion } from "framer-motion";

export function OrbitHero() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center [perspective:1400px]"
    >
      {/* Core glowing sphere */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-40 w-40 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, oklch(0.9 0.18 305 / 0.9), oklch(0.55 0.28 305 / 0.9) 40%, transparent 75%)",
          filter: "blur(2px)",
          boxShadow:
            "0 0 120px 20px oklch(0.72 0.25 305 / 0.55), inset 0 0 60px oklch(0.9 0.18 355 / 0.4)",
        }}
      />
      {/* Inner planet */}
      <div
        className="absolute h-24 w-24 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, #fff, oklch(0.72 0.25 305) 45%, oklch(0.35 0.2 285) 90%)",
          boxShadow: "inset -12px -18px 40px rgba(0,0,0,0.6), 0 0 60px oklch(0.72 0.25 305 / 0.7)",
        }}
      />

      {/* 3D orbit rings */}
      {[
        { size: 18, rot: 65, dur: 22, tilt: 0, color: "305" },
        { size: 26, rot: 55, dur: 30, tilt: 30, color: "355" },
        { size: 34, rot: 72, dur: 40, tilt: -20, color: "260" },
        { size: 42, rot: 60, dur: 55, tilt: 15, color: "305" },
      ].map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: `${o.size}rem`,
            height: `${o.size}rem`,
            borderColor: `oklch(0.72 0.24 ${o.color} / ${0.55 - i * 0.08})`,
            transformStyle: "preserve-3d",
            transform: `rotateZ(${o.tilt}deg)`,
            boxShadow: `0 0 40px -8px oklch(0.72 0.25 ${o.color} / 0.6)`,
          }}
          animate={{ rotateX: [o.rot, o.rot], rotateY: [0, 360] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "linear" }}
        >
          {/* Orbiting satellite */}
          <div
            className="absolute h-3 w-3 rounded-full"
            style={{
              top: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              background: `oklch(0.9 0.2 ${o.color})`,
              boxShadow: `0 0 20px 4px oklch(0.72 0.25 ${o.color} / 0.9)`,
            }}
          />
        </motion.div>
      ))}

      {/* Floating particles (antigravity) */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = (i * 137) % 100;
        const y = (i * 53) % 100;
        return (
          <motion.div
            key={`p-${i}`}
            className="absolute h-1 w-1 rounded-full bg-neon"
            style={{ left: `${x}%`, top: `${y}%`, boxShadow: "0 0 8px 2px oklch(0.72 0.25 305 / 0.8)" }}
            animate={{ y: [0, -30 - (i % 5) * 6, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 5 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
          />
        );
      })}
    </div>
  );
}
