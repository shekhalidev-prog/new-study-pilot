/**
 * Shared, server-side cache for AI-generated topic notes.
 *
 * Why this design:
 * - The primary store is an in-memory Map at module scope. Node/Bun keeps a
 *   single server process alive to serve all concurrent requests, so this
 *   Map is effectively "shared" across every user hitting this server — the
 *   first person to open a topic triggers generation, everyone after gets
 *   an instant cache hit. That's the ~100-concurrent-user win we want.
 * - We also *try* to persist the cache to a local JSON file (best-effort,
 *   via a dynamic `node:fs` import) so it survives a server restart.
 *   Everything here is wrapped so persistence failures never throw — on
 *   runtimes without filesystem access (e.g. an edge/serverless target),
 *   persistence is silently skipped and the app keeps working purely
 *   in-memory.
 * - If you later scale to multiple server instances/regions, swap the two
 *   functions below (getCachedTopic / setCachedTopic) for a real shared
 *   store (Redis, Postgres, Cloudflare KV, etc.) — nothing else in the app
 *   needs to change, since callers only ever go through this module.
 */

type CacheRecord = Record<string, string>;

const memoryCache = new Map<string, string>();

const CACHE_DIR = ".data";
const CACHE_FILE = "topic-notes-cache.json";

let persistenceAvailable = false;
let writeQueued = false;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

/** Normalizes subject/unit/topic strings into a stable cache key. */
export function topicCacheKey(subject: string, unit: string, topic: string): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return `${norm(subject)}::${norm(unit)}::${norm(topic)}`;
}

export function getCachedTopic(key: string): string | null {
  return memoryCache.get(key) ?? null;
}

export function setCachedTopic(key: string, markdown: string): void {
  memoryCache.set(key, markdown);
  scheduleDiskWrite();
}

export function getTopicCacheStats() {
  return { size: memoryCache.size, persistenceAvailable };
}

// ---- best-effort disk persistence (Node/Bun only, silently skipped elsewhere) ----

async function loadFromDisk(): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(process.cwd(), CACHE_DIR, CACHE_FILE);
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as CacheRecord;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") memoryCache.set(key, value);
    }
    persistenceAvailable = true;
    console.log(`✅ Loaded ${memoryCache.size} cached topic notes from disk`);
  } catch {
    // No cache file yet, or no filesystem access on this runtime — that's fine,
    // the in-memory cache still works for the lifetime of this process.
  }
}

// Kick off best-effort load once, at module init.
void loadFromDisk();

function scheduleDiskWrite(): void {
  writeQueued = true;
  if (writeTimer) return;
  // Debounce so a burst of generations doesn't hammer disk I/O.
  writeTimer = setTimeout(() => {
    writeTimer = null;
    if (writeQueued) {
      writeQueued = false;
      void flushToDisk();
    }
  }, 2000);
}

async function flushToDisk(): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dirPath = path.join(process.cwd(), CACHE_DIR);
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, CACHE_FILE);
    const data: CacheRecord = Object.fromEntries(memoryCache);
    await fs.writeFile(filePath, JSON.stringify(data), "utf-8");
    persistenceAvailable = true;
  } catch (err) {
    if (persistenceAvailable) {
      console.warn("⚠️ Could not persist topic notes cache to disk:", err);
    }
    persistenceAvailable = false;
  }
}
