import { useRef, useState } from "react";
import { motion } from "framer-motion";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

export function VoiceButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 2048) {
          setState("idle");
          setErr("Empty recording — please try again.");
          return;
        }
        setState("processing");
        try {
          const fd = new FormData();
          fd.append("file", blob, "recording");
          const r = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (!r.ok) throw new Error(await r.text());
          const { text } = (await r.json()) as { text: string };
          if (text?.trim()) onTranscript(text.trim());
          else setErr("Couldn't hear that — try again.");
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Transcription failed");
        } finally {
          setState("idle");
        }
      };
      recRef.current = rec;
      rec.start();
      setState("recording");
    } catch {
      setErr("Microphone permission denied.");
      setState("idle");
    }
  };

  const stop = () => {
    recRef.current?.stop();
  };

  const busy = disabled || state === "processing";
  const recording = state === "recording";

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        whileTap={{ scale: 0.9 }}
        className={`relative h-11 w-11 rounded-xl flex items-center justify-center transition ${
          recording
            ? "bg-neon-2 text-background"
            : "glass hover:bg-white/10 text-neon"
        } disabled:opacity-40`}
        aria-label={recording ? "Stop recording" : "Start voice input"}
        title={recording ? "Stop" : "Voice input"}
      >
        {state === "processing" ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
          </svg>
        )}
        {recording && (
          <motion.span
            className="absolute inset-0 rounded-xl border-2 border-neon-2"
            animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.button>
      {err && (
        <div className="absolute bottom-full mb-2 right-0 whitespace-nowrap text-[11px] text-destructive glass rounded-lg px-2 py-1">
          {err}
        </div>
      )}
    </div>
  );
}
