import { createStore, getMany, setMany, clear } from "idb-keyval";

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
