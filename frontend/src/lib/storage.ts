// Lightweight local persistence used for: offline read cache, an offline
// mutation queue, and device-local UI prefs (privacy mode, PIN unlock state).
// This is a cache only — the source of truth is always Cloudflare D1 via the Worker API.

const CACHE_PREFIX = "payday:cache:";
const QUEUE_KEY = "payday:queue";
const PRIVACY_KEY = "payday:privacy";
const UNLOCKED_KEY = "payday:unlocked-at";
const THEME_KEY = "payday:theme";

export function cacheSet<T>(key: string, value: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    /* storage full or unavailable */
  }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return (JSON.parse(raw) as { value: T }).value;
  } catch {
    return null;
  }
}

export interface QueuedMutation {
  id: string;
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  createdAt: number;
}

export function queueMutation(m: Omit<QueuedMutation, "id" | "createdAt">) {
  const queue = getQueue();
  queue.push({ ...m, id: crypto.randomUUID(), createdAt: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

export function clearQueueItem(id: string) {
  const queue = getQueue().filter((q) => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getPrivacyMode(): boolean {
  return localStorage.getItem(PRIVACY_KEY) === "1";
}

export function setPrivacyMode(on: boolean) {
  localStorage.setItem(PRIVACY_KEY, on ? "1" : "0");
}

export function getTheme(): "light" | "dark" | "system" {
  return (localStorage.getItem(THEME_KEY) as "light" | "dark" | "system") || "system";
}

export function setTheme(theme: "light" | "dark" | "system") {
  localStorage.setItem(THEME_KEY, theme);
}

const UNLOCK_TTL_MS = 5 * 60 * 1000; // re-ask for PIN after 5 min in background

export function markUnlocked() {
  sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()));
}

export function isUnlocked(): boolean {
  const ts = Number(sessionStorage.getItem(UNLOCKED_KEY) || 0);
  return Date.now() - ts < UNLOCK_TTL_MS;
}

export function lockNow() {
  sessionStorage.removeItem(UNLOCKED_KEY);
}
