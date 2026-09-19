export type RevisionSession = {
  subjectSlug: string;
  subjectName: string;
  unitId: string;
  unitTitle: string;
  minutes: number;
  score: number | null;
  total: number | null;
  weakTopics: string[];
  date: string; // ISO
};

const KEY = "suhail-revision-sessions";

export function loadSessions(): RevisionSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RevisionSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(s: RevisionSession) {
  if (typeof window === "undefined") return;
  const all = [s, ...loadSessions()].slice(0, 100);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full — ignore */
  }
}

export function stats(sessions: RevisionSession[]) {
  const quizzed = sessions.filter((s) => s.score !== null && s.total);
  const correct = quizzed.reduce((n, s) => n + (s.score ?? 0), 0);
  const asked = quizzed.reduce((n, s) => n + (s.total ?? 0), 0);
  return {
    totalMinutes: sessions.reduce((n, s) => n + s.minutes, 0),
    chaptersRevised: new Set(sessions.map((s) => `${s.subjectSlug}:${s.unitId}`)).size,
    accuracy: asked ? Math.round((correct / asked) * 100) : 0,
    lastRevision: sessions[0]?.date ?? null,
    bestScore: quizzed.reduce((n, s) => Math.max(n, s.score ?? 0), 0),
    quizzesTaken: quizzed.length,
  };
}
