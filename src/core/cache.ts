import { createStore, get, getMany, set, setMany, clear } from "idb-keyval";

// Relation graphs barely change, so caching them in IndexedDB makes every run
// after the first one near-instant and keeps us far from API rate limits.
const store = createStore("sequel-locator", "cache");

interface Wrapped<T> {
  v: T;
  t: number;
}

export async function cacheGetMany<T>(
  keys: string[],
  ttlMs: number,
): Promise<(T | undefined)[]> {
  if (!keys.length) return [];
  const rows = await getMany<Wrapped<T>>(keys, store);
  const now = Date.now();
  return rows.map((r) => (r && now - r.t < ttlMs ? r.v : undefined));
}

export async function cacheSetMany<T>(pairs: [string, T][]): Promise<void> {
  if (!pairs.length) return;
  const t = Date.now();
  await setMany(
    pairs.map(([k, v]) => [k, { v, t } satisfies Wrapped<T>]),
    store,
  );
}

export const clearCache = () => clear(store);

// The last finished run, so a page refresh can show it again without a new
// crawl. Kept apart from the relation cache so clearing that doesn't drop it.
// IndexedDB's structured clone keeps the Maps and Sets intact.
const runStore = createStore("sequel-locator-run", "run");
// bump with the relation cache prefix in crawler.ts: the run holds MediaNodes too
const RUN_KEY = "last-run:v2";

export const saveLastRun = <T>(run: T) => set(RUN_KEY, run, runStore);
export const loadLastRun = <T>() => get<T>(RUN_KEY, runStore);
