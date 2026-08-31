import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { subjects } from "@/data/syllabus";

const ADMIN_PASSWORD = "suhail786@";
const SESSION_KEY = "suhail-admin-unlocked";
const PYQ_KEY = "suhail-admin-pyqs";
const NOTE_KEY = "suhail-admin-notes";

type Pyq = {
  id: string;
  title: string;
  subject: string;
  year: string;
  link: string;
  notes: string;
  createdAt: number;
};

type NoteItem = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Suhail Personal AI" },
      { name: "description", content: "Private admin panel for managing PYQs and study data." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setErr("");
    } else {
      setErr("Incorrect password. Access denied.");
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setPw("");
  }

  if (!unlocked) {
    return (
      <div className="mx-auto w-[min(96%,26rem)] px-2 py-16">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-strong rounded-3xl p-8 neon-border"
        >
          <div className="text-xs font-mono text-neon uppercase tracking-widest text-center">
            Restricted
          </div>
          <h1 className="mt-2 text-2xl font-display font-bold text-center">
            Admin <span className="text-gradient">Panel</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Enter the admin password to continue.
          </p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            autoFocus
            className="mt-6 w-full rounded-xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
          />
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-[image:var(--gradient-neon)] text-background px-4 py-3 font-medium neon-glow hover:scale-[1.01] transition"
          >
            Unlock
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[min(96%,64rem)] px-2 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-mono text-neon uppercase tracking-widest">Admin</div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Control <span className="text-gradient">Center</span>
          </h1>
        </div>
        <button
          onClick={logout}
          className="text-sm rounded-xl glass px-4 py-2 hover:bg-white/10 transition"
        >
          Lock
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PyqManager />
        <NotesManager />
      </div>
    </div>
  );
}

function PyqManager() {
  const [items, setItems] = useState<Pyq[]>([]);
  const [form, setForm] = useState({ title: "", subject: subjects[0]?.name ?? "", year: "", link: "", notes: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setItems(JSON.parse(localStorage.getItem(PYQ_KEY) ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  function persist(next: Pyq[]) {
    setItems(next);
    localStorage.setItem(PYQ_KEY, JSON.stringify(next));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const item: Pyq = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      subject: form.subject,
      year: form.year.trim(),
      link: form.link.trim(),
      notes: form.notes.trim(),
      createdAt: Date.now(),
    };
    persist([item, ...items]);
    setForm({ title: "", subject: form.subject, year: "", link: "", notes: "" });
  }

  function remove(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  return (
    <section className="glass-strong rounded-3xl p-6">
      <h2 className="font-display font-semibold text-xl">PYQ Manager</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Add previous year questions (title, subject, year, link).
      </p>

      <form onSubmit={add} className="mt-5 space-y-3">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Question / paper title"
          className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
          >
            {subjects.map((s) => (
              <option key={s.slug} value={s.name} className="bg-background">
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="Year (e.g. 2024)"
            className="rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
          />
        </div>
        <input
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          placeholder="Link (PDF / Drive URL) — optional"
          className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Question text / notes (optional)"
          rows={3}
          className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)] resize-none"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-[image:var(--gradient-neon)] text-background px-4 py-2.5 text-sm font-medium neon-glow hover:scale-[1.01] transition"
        >
          Add PYQ
        </button>
      </form>

      <div className="mt-6 space-y-3 max-h-[420px] overflow-auto pr-1">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            No PYQs added yet.
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{i.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {i.subject} {i.year && `· ${i.year}`}
                </div>
                {i.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{i.notes}</p>}
                {i.link && (
                  <a
                    href={i.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-neon hover:underline break-all"
                  >
                    {i.link}
                  </a>
                )}
              </div>
              <button
                onClick={() => remove(i.id)}
                className="text-xs rounded-lg px-2 py-1 hover:bg-white/10 text-muted-foreground"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesManager() {
  const [items, setItems] = useState<NoteItem[]>([]);
  const [form, setForm] = useState({ title: "", body: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setItems(JSON.parse(localStorage.getItem(NOTE_KEY) ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  function persist(next: NoteItem[]) {
    setItems(next);
    localStorage.setItem(NOTE_KEY, JSON.stringify(next));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    persist([
      { id: crypto.randomUUID(), title: form.title.trim(), body: form.body.trim(), createdAt: Date.now() },
      ...items,
    ]);
    setForm({ title: "", body: "" });
  }

  function remove(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  return (
    <section className="glass-strong rounded-3xl p-6">
      <h2 className="font-display font-semibold text-xl">Notes & Announcements</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Post extra study data, tips, or announcements.
      </p>

      <form onSubmit={add} className="mt-5 space-y-3">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
          className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)]"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Write anything — notes, links, tips…"
          rows={5}
          className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--neon)] resize-none"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-[image:var(--gradient-neon)] text-background px-4 py-2.5 text-sm font-medium neon-glow hover:scale-[1.01] transition"
        >
          Publish Note
        </button>
      </form>

      <div className="mt-6 space-y-3 max-h-[420px] overflow-auto pr-1">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            No notes yet.
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{i.title}</div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{i.body}</p>
                <div className="text-[10px] text-muted-foreground/70 mt-2">
                  {new Date(i.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => remove(i.id)}
                className="text-xs rounded-lg px-2 py-1 hover:bg-white/10 text-muted-foreground"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
