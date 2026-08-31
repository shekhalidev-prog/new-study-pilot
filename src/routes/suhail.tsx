import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Markdown } from "@/components/Markdown";
import { VoiceButton } from "@/components/VoiceButton";
import { SuhailAvatar } from "@/components/suhail/SuhailAvatar";
import {
  deleteConversation,
  deriveTitle,
  loadStore,
  newId,
  saveConversation,
  setActive,
  type SuhailConversation,
} from "@/lib/suhail-storage";
import { speak, type TTSHandle } from "@/lib/tts-player";

export const Route = createFileRoute("/suhail")({
  head: () => ({
    meta: [
      { title: "Suhail AI — Your Anime AI Assistant" },
      {
        name: "description",
        content:
          "Chat with Suhail, a friendly futuristic AI companion. Ask anything in any language — study help, code, math, notes, translations, and more.",
      },
      { property: "og:title", content: "Suhail AI — Anime AI Assistant" },
      { property: "og:description", content: "Talk or type in any language. Suhail explains everything simply." },
    ],
  }),
  component: SuhailPage,
});

type Mode = "default" | "beginner" | "class10" | "btech" | "mcq" | "revision" | "notes";
const MODES: { id: Mode; label: string }[] = [
  { id: "default", label: "Normal" },
  { id: "beginner", label: "Beginner" },
  { id: "class10", label: "Class 10" },
  { id: "btech", label: "B.Tech" },
  { id: "mcq", label: "MCQs" },
  { id: "revision", label: "Revision" },
  { id: "notes", label: "Notes" },
];

const CHIPS: { label: string; prompt: (last: string) => string }[] = [
  { label: "Explain simpler", prompt: (l) => `Explain your last answer even more simply${l ? `: "${l.slice(0, 80)}"` : ""}.` },
  { label: "Give example", prompt: () => "Give a concrete real-world example for that." },
  { label: "Translate", prompt: () => "Translate your last answer to English." },
  { label: "Summarize", prompt: () => "Summarize your last answer in 3 bullet points." },
  { label: "Create notes", prompt: () => "Turn that into clean study notes with headings and bullets." },
  { label: "Quiz me", prompt: () => "Quiz me with 5 MCQs on that topic. Reveal answers after." },
  { label: "Practice", prompt: () => "Give me 5 practice questions with step-by-step solutions." },
];

function SuhailPage() {
  const [convos, setConvos] = useState<SuhailConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("default");
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSide, setShowSide] = useState(false);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [avatarState, setAvatarState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const ttsRef = useRef<TTSHandle | null>(null);
  const ampRef = useRef<() => number>(() => 0);
  const spokenIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // bootstrap store once (StrictMode-safe)
  useEffect(() => {
    const store = loadStore();
    if (store.conversations.length === 0) {
      const c: SuhailConversation = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [] };
      saveConversation(c);
      setConvos([c]);
      setActiveId(c.id);
    } else {
      setConvos(store.conversations);
      setActiveId(store.activeId ?? store.conversations[0].id);
    }
  }, []);

  const active = convos.find((c) => c.id === activeId) ?? null;

  const { messages, sendMessage, status, setMessages, regenerate, error } = useChat({
    id: activeId ?? "suhail",
    messages: active?.messages ?? [],
    transport: useMemo(
      () => new DefaultChatTransport({ api: "/api/suhail", body: { mode } }),
      [mode],
    ),
  });

  // persist on message change
  useEffect(() => {
    if (!activeId) return;
    if (messages.length === 0) return;
    const convo: SuhailConversation = {
      id: activeId,
      title: deriveTitle(messages),
      updatedAt: Date.now(),
      messages,
    };
    saveConversation(convo);
    setConvos((prev) => {
      const others = prev.filter((c) => c.id !== activeId);
      return [convo, ...others];
    });
  }, [messages, activeId]);

  const busy = status === "submitted" || status === "streaming";

  // avatar state
  useEffect(() => {
    if (busy) setAvatarState("thinking");
    else if (ttsRef.current?.isSpeaking()) setAvatarState("speaking");
    else setAvatarState("idle");
  }, [busy]);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  // TTS on new completed assistant message
  useEffect(() => {
    if (muted || busy) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdRef.current === last.id) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
    if (!text) return;
    spokenIdRef.current = last.id;
    (async () => {
      ttsRef.current?.stop();
      try {
        const handle = await speak(stripMarkdown(text), { speed });
        ttsRef.current = handle;
        ampRef.current = handle.amplitude;
        setAvatarState("speaking");
        await handle.done;
        setAvatarState("idle");
      } catch {
        setAvatarState("idle");
      }
    })();
  }, [messages, busy, muted, speed]);

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    ttsRef.current = null;
    setAvatarState("idle");
  }, []);

  useEffect(() => () => ttsRef.current?.stop(), []);

  const submit = (text: string) => {
    const v = text.trim();
    if (!v || busy) return;
    stopSpeaking();
    sendMessage({ text: v });
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startNew = () => {
    stopSpeaking();
    const c: SuhailConversation = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [] };
    saveConversation(c);
    setConvos((prev) => [c, ...prev]);
    setActiveId(c.id);
    setMessages([]);
  };

  const switchTo = (id: string) => {
    stopSpeaking();
    setActive(id);
    setActiveId(id);
    const convo = convos.find((c) => c.id === id);
    setMessages((convo?.messages ?? []) as UIMessage[]);
    setShowSide(false);
  };

  const removeConvo = (id: string) => {
    deleteConversation(id);
    setConvos((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      const next = convos.find((c) => c.id !== id);
      if (next) switchTo(next.id);
      else startNew();
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastText = lastAssistant?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";

  const filteredConvos = convos.filter((c) =>
    !search.trim() ? true : c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 top-20 flex bg-background/60">
      {/* sidebar */}
      <AnimatePresence>
        {showSide && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="absolute left-0 top-0 bottom-0 w-72 glass-strong border-r border-white/10 p-3 z-20 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">History</div>
              <button onClick={() => setShowSide(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="glass rounded-lg px-3 py-1.5 text-sm outline-none mb-2"
            />
            <button
              onClick={startNew}
              className="mb-3 rounded-xl bg-[image:var(--gradient-neon)] text-background px-3 py-2 text-sm font-medium"
            >
              + New chat
            </button>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredConvos.map((c) => (
                <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-white/5 ${c.id === activeId ? "bg-white/10" : ""}`}>
                  <button onClick={() => switchTo(c.id)} className="flex-1 text-left text-sm truncate">
                    {c.title}
                  </button>
                  <button
                    onClick={() => removeConvo(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive px-1"
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {filteredConvos.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">No chats yet.</div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* main */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Avatar column */}
        <div className="md:w-[380px] flex-shrink-0 flex flex-col items-center justify-start md:justify-center gap-4 p-4 md:p-6 border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex md:hidden items-center gap-2 w-full">
            <button onClick={() => setShowSide(true)} className="glass rounded-lg px-3 py-1.5 text-xs">☰ History</button>
            <Link to="/" className="ml-auto glass rounded-lg px-3 py-1.5 text-xs">← Home</Link>
          </div>
          <SuhailAvatar state={avatarState} amplitude={ampRef.current} size={260} />
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-cyan-300">Suhail AI</div>
            <div className="text-lg font-display font-semibold text-gradient">Your anime companion</div>
            <div className="text-xs text-muted-foreground mt-1 capitalize">{avatarState}</div>
          </div>
          <div className="w-full glass rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMuted((m) => !m)}
                className={`flex-1 mr-2 rounded-lg px-3 py-1.5 text-xs font-medium ${muted ? "bg-white/10" : "bg-cyan-400/20 text-cyan-200"}`}
              >
                {muted ? "🔇 Voice off" : "🔊 Voice on"}
              </button>
              <button
                onClick={stopSpeaking}
                className="rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20"
              >
                ⏹ Stop
              </button>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Speed {speed.toFixed(2)}×</div>
              <input
                type="range"
                min={0.75}
                max={1.5}
                step={0.25}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Mode</div>
              <div className="flex flex-wrap gap-1">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`rounded-md px-2 py-1 text-[11px] ${mode === m.id ? "bg-cyan-400/25 text-cyan-100" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat column */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="hidden md:flex items-center gap-2 p-3 border-b border-white/10">
            <button onClick={() => setShowSide((s) => !s)} className="glass rounded-lg px-3 py-1.5 text-xs">☰ History</button>
            <button onClick={startNew} className="glass rounded-lg px-3 py-1.5 text-xs">+ New</button>
            <div className="ml-auto text-xs text-muted-foreground truncate max-w-[50%]">
              {active?.title}
            </div>
            <Link to="/" className="glass rounded-lg px-3 py-1.5 text-xs">← Home</Link>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="max-w-xl mx-auto text-center py-10">
                <h1 className="text-2xl md:text-3xl font-display font-bold">
                  Hi, I'm <span className="text-gradient">Suhail</span>.
                </h1>
                <p className="text-muted-foreground mt-2">
                  Ask me anything in any language — I'll reply in the same one. Try one of these:
                </p>
                <div className="mt-4 grid sm:grid-cols-2 gap-2 text-left">
                  {[
                    "Explain quantum computing like I'm 10",
                    "Write Python code to reverse a linked list",
                    "Hindi mein bataao — machine learning kya hai?",
                    "Give 5 MCQs on Operating Systems deadlocks",
                  ].map((s) => (
                    <button key={s} onClick={() => submit(s)} className="glass rounded-xl p-3 text-sm hover:bg-white/10 transition">
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
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {isUser ? (
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[image:var(--gradient-neon)] text-background font-medium whitespace-pre-wrap">
                      {text}
                    </div>
                  ) : (
                    <div className="max-w-[92%] w-full">
                      <div className="text-xs text-cyan-300 mb-1 font-mono flex items-center gap-2">
                        <span>Suhail</span>
                        <div className="flex gap-1 opacity-70">
                          <button
                            onClick={() => navigator.clipboard.writeText(text)}
                            className="hover:text-foreground"
                            title="Copy"
                          >📋</button>
                          <button
                            onClick={() => {
                              if (navigator.share) navigator.share({ text }).catch(() => {});
                              else navigator.clipboard.writeText(text);
                            }}
                            className="hover:text-foreground"
                            title="Share"
                          >↗</button>
                          {m.id === lastAssistant?.id && !busy && (
                            <button onClick={() => { stopSpeaking(); regenerate(); }} className="hover:text-foreground" title="Regenerate">↻</button>
                          )}
                        </div>
                      </div>
                      <Markdown>{text || "…"}</Markdown>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {busy && (
              <div className="text-sm text-cyan-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse-glow" />
                Thinking…
              </div>
            )}
            {error && <div className="text-destructive text-sm">Error: {error.message}</div>}
          </div>

          {/* quick chips */}
          {messages.length > 0 && (
            <div className="px-3 pt-2 flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button
                  key={c.label}
                  disabled={busy}
                  onClick={() => submit(c.prompt(lastText))}
                  className="glass rounded-full px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-40"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
            className="m-3 glass-strong rounded-2xl p-2 flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
              }}
              rows={1}
              placeholder="Ask Suhail anything…  (any language)"
              className="flex-1 resize-none bg-transparent px-3 py-2.5 outline-none placeholder:text-muted-foreground max-h-40"
            />
            <VoiceButton
              disabled={busy}
              onTranscript={(t) => submit(t)}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-background disabled:opacity-40 hover:scale-[1.02] transition"
              style={{ background: "linear-gradient(135deg,#22d3ee,#8b5cf6)" }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`[^`]+`/g, "")
    .replace(/[#*_>|-]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
