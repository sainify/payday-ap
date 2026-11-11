// Lightweight local persistence used for: offline read cache, an offline
// mutation queue, and device-local UI prefs (privacy mode, PIN unlock state).
// This is a cache only — the source of truth is always Cloudflare D1 via the Worker API.

const CACHE_PREFIX = "payday:cache:";
const QUEUE_KEY = "payday:queue";
const PRIVACY_KEY = "payday:privacy";
const UNLOCKED_KEY = "payday:unlocked-at";
const THEME_KEY = "payday:theme";
const KEY_DB = "payday-secure-cache";
const KEY_STORE = "crypto-keys";
const KEY_ID = "device-cache-key";

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(KEY_DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(KEY_STORE);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
async function getDeviceKey(): Promise<CryptoKey> {
  const db=await openKeyDb();
  const existing=await new Promise<CryptoKey|undefined>((resolve,reject)=>{
    const request=db.transaction(KEY_STORE,"readonly").objectStore(KEY_STORE).get(KEY_ID);
    request.onsuccess=()=>resolve(request.result as CryptoKey|undefined);
    request.onerror=()=>reject(request.error);
  });
  if(existing){db.close();return existing;}
  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(KEY_STORE,"readwrite");
    tx.objectStore(KEY_STORE).put(key,KEY_ID);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
  db.close();
  return key;
}

/** Encrypt cached account data with a non-exportable device key before it reaches localStorage. */
export async function cacheSet<T>(key: string, value: T) {
  try {
    const cryptoKey=await getDeviceKey();
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const plain=new TextEncoder().encode(JSON.stringify({value,ts:Date.now()}));
    const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},cryptoKey,plain);
    const bytes=new Uint8Array(encrypted);
    const payload=btoa(String.fromCharCode(...bytes));
    localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({v:1,iv:btoa(String.fromCharCode(...iv)),data:payload}));
  } catch {
    /* Cache encryption/storage failure must not block online app use. */
  }
}

export async function cacheGet<T>(key: string): Promise<T|null> {
  try {
    const raw=localStorage.getItem(CACHE_PREFIX+key);
    if(!raw)return null;
    const record=JSON.parse(raw) as {v?:number;iv?:string;data?:string;value?:T};
    if(record.v!==1 || !record.iv || !record.data) {
      // Remove old unencrypted cache rather than continue exposing financial records at rest.
      localStorage.removeItem(CACHE_PREFIX+key);
      return null;
    }
    const decode=(s:string)=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0));
    const cryptoKey=await getDeviceKey();
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(record.iv)},cryptoKey,decode(record.data));
    return (JSON.parse(new TextDecoder().decode(plain)) as {value:T}).value;
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

const ACTIVE_USER_KEY = "payday:active-user";

/** Clears only financial/offline data, keeping device UI preferences intact. */
export function clearFinancialLocalData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore unavailable storage */
  }
}

/** Prevents cached/queued data from one account appearing in another account. */
export function switchUserScope(userId: string) {
  try {
    const previous = localStorage.getItem(ACTIVE_USER_KEY);
    if (previous && previous !== userId) clearFinancialLocalData();
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch {
    /* ignore unavailable storage */
  }
}

export function clearUserScope() {
  clearFinancialLocalData();
  try { localStorage.removeItem(ACTIVE_USER_KEY); } catch { /* ignore */ }
}
