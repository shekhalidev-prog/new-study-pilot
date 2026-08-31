import type { UIMessage } from "ai";

export type SuhailConversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const KEY = "suhail:v1";

type Store = { conversations: SuhailConversation[]; activeId: string | null };

function read(): Store {
  if (typeof window === "undefined") return { conversations: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { conversations: [], activeId: null };
    return JSON.parse(raw) as Store;
  } catch {
    return { conversations: [], activeId: null };
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function loadStore(): Store {
  return read();
}

export function saveConversation(convo: SuhailConversation) {
  const store = read();
  const idx = store.conversations.findIndex((c) => c.id === convo.id);
  if (idx >= 0) store.conversations[idx] = convo;
  else store.conversations.unshift(convo);
  store.conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  store.activeId = convo.id;
  write(store);
}

export function deleteConversation(id: string) {
  const store = read();
  store.conversations = store.conversations.filter((c) => c.id !== id);
  if (store.activeId === id) store.activeId = store.conversations[0]?.id ?? null;
  write(store);
}

export function setActive(id: string) {
  const store = read();
  store.activeId = id;
  write(store);
}

export function newId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function deriveTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const text = first.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
  return text.slice(0, 48) || "New chat";
}
