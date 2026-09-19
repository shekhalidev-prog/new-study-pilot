import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Markdown } from "@/components/Markdown";
import { askMyNotes, summarizeMyNotes } from "@/lib/clone-ai.functions";

export const Route = createFileRoute("/clone")({
  head: () => ({
    meta: [
      { title: "AI Study Clone — Suhail Personal AI" },
      {
        name: "description",
        content:
          "Upload or paste your own class notes and get an AI tutor that answers strictly from your notes, in Hinglish and English.",
      },
      { property: "og:title", content: "AI Study Clone — Ask My Notes" },
      {
        property: "og:description",
        content:
          "Your notes, your tutor. Paste notes and ask questions answered only from your material.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClonePage,
});

const NOTES_KEY = "suhail-study-clone-notes";

function ClonePage() {
  const [notes, setNotes] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [summary, setSummary] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotes(localStorage.getItem(NOTES_KEY) ?? "");
  }, []);

  const persist = (value: string) => {
    setNotes(value);
    localStorage.setItem(NOTES_KEY, value);
  };

  const ask = useServerFn(askMyNotes);
  const summarize = useServerFn(summarizeMyNotes);

  const askM = useMutation({
    mutationFn: (q: string) => ask({ data: { notes, question: q } }),
    onSuccess: (r) => setAnswer(r.markdown),
  });
  const sumM = useMutation({
    mutationFn: () => summarize({ data: { notes } }),
    onSuccess: (r) => setSummary(r.markdown),
  });

  const onFile = async (file: File) => {
    const text = await file.text();
    persist((notes ? notes + "\n\n" : "") + text);
  };

  const ready = notes.trim().length > 20;

  return (
    <div className="mx-auto w-[min(96%,60rem)] px-2 py-10">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-neon">AI Study Clone</div>
        <h1 className="mt-2 text-3xl md:text-5xl font-display font-bold">
          Ask <span className="text-gradient">My Notes</span>
        </h1>
        <p className="mt-3 text-muted-foreground text-sm md:text-base">
          Apne class notes paste karo ya .txt/.md file upload karo — AI sirf tumhare notes se jawab
          dega.
        </p>
      </div>

      <div className="glass-strong rounded-2xl p-4 md:p-6 mt-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-medium">Your notes</div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              📄 Upload .txt / .md
            </button>
            {notes && (
              <button
                type="button"
                onClick={() => persist("")}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => persist(e.target.value)}
          rows={10}
          placeholder="Yahan apne notes paste karo…"
          className="mt-3 w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm outline-none focus:border-neon/60 resize-y"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {notes.trim()
              ? `${notes.trim().split(/\s+/).length} words saved on this device`
              : "No notes yet"}
          </span>
          <button
            type="button"
            disabled={!ready || sumM.isPending}
            onClick={() => sumM.mutate()}
            className="px-3 py-1.5 rounded-lg bg-[image:var(--gradient-neon)] text-background font-medium disabled:opacity-40"
          >
            {sumM.isPending ? "Reading…" : "🧠 Summarize my notes"}
          </button>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-4 md:p-6 mt-5">
        <div className="text-sm font-medium">Ask a question</div>
        <div className="mt-3 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && ready && question.trim()) askM.mutate(question.trim());
            }}
            placeholder="Mere notes ke hisaab se deadlock explain karo…"
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-neon/60"
          />
          <button
            type="button"
            disabled={!ready || !question.trim() || askM.isPending}
            onClick={() => askM.mutate(question.trim())}
            className="px-4 py-2.5 rounded-xl bg-[image:var(--gradient-neon)] text-background text-sm font-medium disabled:opacity-40"
          >
            {askM.isPending ? "…" : "Ask"}
          </button>
        </div>
        {!ready && (
          <p className="mt-2 text-xs text-muted-foreground">Pehle thode notes add karo.</p>
        )}
        {(askM.error || sumM.error) && (
          <p className="mt-2 text-xs text-red-400">
            {(askM.error as Error)?.message ?? (sumM.error as Error)?.message}
          </p>
        )}
      </div>

      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-4 md:p-6 mt-5"
          >
            <Markdown>{answer}</Markdown>
          </motion.div>
        )}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-4 md:p-6 mt-5"
          >
            <Markdown>{summary}</Markdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
