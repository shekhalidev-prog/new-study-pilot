import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Markdown } from "@/components/Markdown";
import { VoiceButton } from "@/components/VoiceButton";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Tutor — Orbit Exam Console" },
      { name: "description", content: "Ask Orbit AI anything about your B.Tech AI/ML syllabus and get exam-ready answers." },
    ],
  }),
  component: ChatPage,
});

const suggestions = [
  "Explain A* algorithm with an example",
  "Difference between paging and segmentation?",
  "What is Bias-Variance tradeoff in ML?",
  "Give me 5 viva questions on Deadlocks",
  "Compare Bluetooth vs ZigBee vs Wi-Fi for IoT",
];

function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="mx-auto w-[min(96%,52rem)] px-2 py-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="text-center mb-4">
        <div className="text-xs uppercase tracking-widest text-neon">AI Tutor</div>
        <h1 className="mt-1 text-3xl md:text-4xl font-display font-bold">
          Ask <span className="text-gradient">Orbit AI</span>
        </h1>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto glass-strong rounded-3xl p-4 md:p-6 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-6">
              Ask any concept from your syllabus. I'll answer in clear structured notes with examples.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-left glass rounded-2xl p-3 text-sm hover:bg-white/10 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const isUser = m.role === "user";
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              {isUser ? (
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[image:var(--gradient-neon)] text-background font-medium">
                  {text}
                </div>
              ) : (
                <div className="max-w-[90%] w-full">
                  <div className="text-xs text-neon mb-1 font-mono">Orbit AI</div>
                  <Markdown>{text || "…"}</Markdown>
                </div>
              )}
            </motion.div>
          );
        })}

        {busy && (
          <div className="text-sm text-neon flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse-glow" />
            Thinking…
          </div>
        )}
        {error && (
          <div className="text-destructive text-sm">Error: {error.message}</div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(input); }}
        className="mt-4 glass-strong rounded-2xl p-2 flex items-end gap-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={1}
          placeholder="Ask about any topic… (Shift+Enter for newline)"
          className="flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted-foreground max-h-40"
        />
        <VoiceButton
          disabled={busy}
          onTranscript={(t) => submit(t)}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-[image:var(--gradient-neon)] text-background px-4 py-2.5 text-sm font-medium disabled:opacity-40 hover:scale-[1.02] transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
