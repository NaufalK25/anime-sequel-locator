// Page scrolling that stays smooth over long distances. The browser's own
// smooth scroll squeezes thousands of pixels into a fixed short burst, and it
// aims at where the target was when it started, so it lands off if the layout
// shifts on the way. This one paces itself by distance and re-aims every frame.

/** Input that means the user wants to scroll themselves. */
const takeover = ["wheel", "touchstart", "mousedown", "keydown"] as const;

const easeInOut = (p: number) =>
  p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;

let stopCurrent: (() => void) | null = null;

/**
 * Scroll the page to `target()`, read again every frame so the scroll follows
 * the target if content above it changes height. Starting a new scroll, or
 * the user scrolling, stops the one running.
 */
export function smoothScrollTo(target: () => number) {
  stopCurrent?.();
  const max = () => document.documentElement.scrollHeight - innerHeight;
  const goal = () => Math.max(0, Math.min(target(), max()));
  const to = (y: number) => window.scrollTo({ top: y, behavior: "instant" });

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    to(goal());
    return;
  }

  // Animate the whole way. Time grows with the square root of the distance, so
  // a long trip runs faster instead of dragging on: one screen takes ~0.4 s,
  // 25 screens ~0.9 s, and nothing takes longer than 1.2 s.
  const start = window.scrollY;
  const screens = Math.abs(goal() - start) / innerHeight;
  const duration = Math.min(1200, 300 + 120 * Math.sqrt(screens));

  let begin: number | undefined;
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const e of takeover) removeEventListener(e, stop);
    if (stopCurrent === stop) stopCurrent = null;
  };
  const step = (now: number) => {
    if (begin === undefined) {
      begin = now;
      // only from here: the click or Enter that started the scroll may still
      // be on its way to window, and must not stop it
      for (const e of takeover)
        addEventListener(e, stop, { passive: true, once: true });
    }
    const p = Math.min(1, (now - begin) / duration);
    to(start + (goal() - start) * easeInOut(p));
    if (p < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
  stopCurrent = stop;
}
