export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

/**
 * Serializes async jobs and keeps at least `minIntervalMs` between them.
 * Enough for a public API; 429s are handled by the caller (see anilist.ts).
 */
export function createLimiter(minIntervalMs: number) {
  let chain: Promise<unknown> = Promise.resolve();
  let last = 0;

  return {
    schedule<T>(job: () => Promise<T>): Promise<T> {
      const run = async () => {
        const wait = last + minIntervalMs - Date.now();
        if (wait > 0) await sleep(wait);
        try {
          return await job();
        } finally {
          last = Date.now();
        }
      };
      const p = chain.then(run, run);
      chain = p.catch(() => undefined);
      return p;
    },
  };
}
