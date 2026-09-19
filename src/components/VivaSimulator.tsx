import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { CircularProgress } from "@/components/CircularProgress";
import { speak } from "@/lib/tts-player";
import { blobToWav16k, browserSpeak } from "@/lib/audio-utils";
import {
  generateVivaQuestions,
  evaluateViva,
  type VivaQuestion,
  type VivaEvaluation,
} from "@/lib/viva-ai.functions";

type Answer = { question: string; idealAnswer: string; spoken: string; seconds: number };

export function VivaSimulator({
  subject,
  unit,
  topics,
  disabled,
}: {
  subject: string;
  unit: string;
  topics: string[];
  disabled: boolean;
}) {
  const runQuestions = useServerFn(generateVivaQuestions);
  const runEval = useServerFn(evaluateViva);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [camOn, setCamOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<VivaQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState<"" | "questions" | "transcribe" | "eval">("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [result, setResult] = useState<VivaEvaluation | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setCamOn(true);
    } catch {
      setError("Camera/mic permission chahiye. Browser ki permission allow karke dobara try karo.");
    }
  }

  async function startViva() {
    setBusy("questions");
    setError(null);
    setResult(null);
    setAnswers([]);
    setIndex(0);
    setLastTranscript("");
    try {
      const res = await runQuestions({ data: { subject, unit, topics, count: 6 } });
      if (!res.questions.length) throw new Error("empty");
      setQuestions(res.questions);
      void askAloud(res.questions[0].question);
    } catch {
      setError("Viva questions generate nahi ho paye. Dobara try karo.");
    } finally {
      setBusy("");
    }
  }

  async function askAloud(text: string) {
    try {
      const h = await speak(text);
      await h.done;
      if (h.failed()) await browserSpeak(text);
    } catch {
      await browserSpeak(text);
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const audio = new MediaStream(stream.getAudioTracks());
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const rec = new MediaRecorder(audio, { mimeType: mime });
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => void handleAnswerBlob(new Blob(chunksRef.current, { type: mime }));
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    rec.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function handleAnswerBlob(blob: Blob) {
    const seconds = (Date.now() - startedAtRef.current) / 1000;
    const q = questions?.[index];
    if (!q) return;
    let spoken = "";
    if (blob.size > 1024) {
      setBusy("transcribe");
      try {
        const upload = await blobToWav16k(blob);
        const fd = new FormData();
        fd.append(
          "file",
          upload,
          upload.type === "audio/wav"
            ? "answer.wav"
            : blob.type.includes("mp4")
              ? "answer.mp4"
              : "answer.webm",
        );
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        if (res.ok) {
          spoken = ((await res.json()) as { text?: string }).text ?? "";
        } else {
          setError(
            "Voice transcription abhi available nahi hai (GROQ_API_KEY / GEMINI_API_KEY check karo). Answer score nahi ho payega.",
          );
        }
      } catch {
        setError("Voice transcription fail ho gaya. Internet check karke dobara try karo.");
      } finally {
        setBusy("");
      }
    }
    setLastTranscript(spoken || "(kuch sunai nahi diya)");
    setAnswers((a) => [
      ...a,
      { question: q.question, idealAnswer: q.idealAnswer, spoken, seconds },
    ]);
  }

  function nextQuestion() {
    if (!questions) return;
    const n = index + 1;
    setLastTranscript("");
    if (n < questions.length) {
      setIndex(n);
      void askAloud(questions[n].question);
    }
  }

  async function finishViva() {
    if (!answers.length) return;
    setBusy("eval");
    setError(null);
    try {
      const res = await runEval({ data: { subject, unit, answers } });
      setResult(res);
    } catch {
      setError("Evaluation fail ho gaya. Dobara try karo.");
    } finally {
      setBusy("");
    }
  }

  const current = questions?.[index] ?? null;
  const answered = answers.length;

  return (
    <section className="mt-10 glass-strong rounded-3xl p-6">
      <div className="text-xs uppercase tracking-widest text-neon">Mock viva simulator</div>
      <h2 className="font-display text-2xl font-semibold">🎓 Real viva feel — camera + mic</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Examiner sawaal bolega, tum camera ke saamne bolke jawab dogi/doge — AI confidence score
        dega.
      </p>

      <div className="mt-6 grid lg:grid-cols-2 gap-5">
        {/* Camera panel */}
        <div className="glass rounded-2xl p-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/60 ring-1 ring-white/10">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover -scale-x-100"
            />
            {!camOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
                <div className="text-3xl">🎥</div>
                <p className="text-xs text-muted-foreground">
                  Camera off — viva start karne ke liye on karo
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-[image:var(--gradient-neon)] text-background text-sm font-medium"
                >
                  Enable camera &amp; mic
                </button>
              </div>
            ) : null}
            {recording ? (
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> REC
              </div>
            ) : null}
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-[image:var(--gradient-neon)]"
              animate={{ width: `${Math.round(level * 100)}%` }}
              transition={{ duration: 0.08 }}
            />
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            Mic level
          </div>
        </div>

        {/* Examiner panel */}
        <div className="glass rounded-2xl p-4 flex flex-col">
          {!questions ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
              <div className="text-3xl">🧑‍🏫</div>
              <p className="text-sm text-muted-foreground">
                Subject aur chapter select karke viva start karo — 6 spoken questions.
              </p>
              <button
                disabled={disabled || !camOn || busy === "questions"}
                onClick={startViva}
                className="px-5 py-3 rounded-xl bg-[image:var(--gradient-neon)] text-background font-medium disabled:opacity-40"
              >
                {busy === "questions" ? "Examiner ready ho raha hai…" : "Start mock viva"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Question {Math.min(index + 1, questions.length)} / {questions.length}
                </span>
                <span>{answered} answered</span>
              </div>
              <div className="mt-3 text-lg font-display font-semibold">{current?.question}</div>
              <div className="mt-1 text-xs text-neon">{current?.topic}</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => current && void askAloud(current.question)}
                  className="px-3 py-2 rounded-xl glass text-sm hover:bg-white/5"
                >
                  🔊 Repeat
                </button>
                {!recording ? (
                  <button
                    disabled={!camOn || busy !== "" || answers.length > index}
                    onClick={startRecording}
                    className="px-4 py-2 rounded-xl bg-[image:var(--gradient-neon)] text-background text-sm font-medium disabled:opacity-40"
                  >
                    🎙 Answer bolo
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2 rounded-xl bg-red-500/80 text-white text-sm font-medium"
                  >
                    ⏹ Stop &amp; submit
                  </button>
                )}
                {answers.length > index && index + 1 < questions.length ? (
                  <button
                    onClick={nextQuestion}
                    className="px-4 py-2 rounded-xl glass text-sm hover:bg-white/5"
                  >
                    Next question →
                  </button>
                ) : null}
                {answers.length >= questions.length ? (
                  <button
                    disabled={busy === "eval"}
                    onClick={finishViva}
                    className="px-4 py-2 rounded-xl glass-strong text-sm font-medium disabled:opacity-40"
                  >
                    {busy === "eval" ? "Result nikal raha hu…" : "Finish & get confidence score"}
                  </button>
                ) : null}
              </div>

              {busy === "transcribe" ? (
                <p className="mt-3 text-sm text-muted-foreground">Answer sun raha hu…</p>
              ) : lastTranscript ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="text-neon">Tumne kaha: </span>
                  {lastTranscript}
                </p>
              ) : null}
            </>
          )}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </div>
      </div>

      <AnimatePresence>
        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 glass rounded-2xl p-5"
          >
            <div className="flex flex-wrap items-center gap-6">
              <CircularProgress value={result.confidence} sublabel="confidence" />
              <CircularProgress value={result.knowledge} sublabel="knowledge" size={100} />
              <CircularProgress value={result.fluency} sublabel="fluency" size={100} />
              <p className="text-sm text-muted-foreground max-w-sm">{result.verdict}</p>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neon">Strengths</div>
                <ul className="mt-2 text-sm space-y-1 text-muted-foreground">
                  {result.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="text-xs uppercase tracking-widest text-neon">Improve</div>
                <ul className="mt-2 text-sm space-y-1 text-muted-foreground">
                  {result.improvements.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {result.perQuestion.map((q, i) => (
                <div key={i} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-sm">{q.question}</div>
                    <div className="font-mono text-neon text-sm">{q.score}/10</div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{q.feedback}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
