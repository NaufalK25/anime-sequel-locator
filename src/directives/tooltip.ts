import type { Directive } from "vue";

/*
  v-tooltip="text": a themed replacement for the native title attribute.
  One shared element is appended to <body> and moved to whichever anchor is
  hovered or focused, so hundreds of anchors cost only a few listeners each.
  A falsy value means no tooltip.
*/

const GAP = 6; // px between anchor and tooltip
const MARGIN = 8; // px kept clear of the viewport edges
const DELAY = 250; // ms before showing, skipped when moving between anchors

const texts = new WeakMap<HTMLElement, string>();
let tip: HTMLDivElement | null = null;
let anchor: HTMLElement | null = null;
let timer = 0;
let hiddenAt = 0;

function tipEl() {
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "tooltip";
    tip.setAttribute("role", "tooltip");
    tip.className =
      "pointer-events-none fixed top-0 left-0 z-50 max-w-72 rounded-md bg-ink px-2.5 py-1.5 text-[13px] leading-snug text-paper shadow-lg opacity-0 transition-opacity duration-100";
    document.body.append(tip);
  }
  return tip;
}

function place(target: HTMLElement, t: HTMLElement) {
  const a = target.getBoundingClientRect();
  const { width, height } = t.getBoundingClientRect();
  // above the anchor, or below it when there's no room
  let top = a.top - height - GAP;
  if (top < MARGIN) top = a.bottom + GAP;
  const left = Math.min(
    Math.max(a.left + a.width / 2 - width / 2, MARGIN),
    window.innerWidth - width - MARGIN,
  );
  t.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function show(target: HTMLElement) {
  const text = texts.get(target);
  if (!text || !target.isConnected) return hide();
  const t = tipEl();
  // an open modal dialog sits in the top layer, above anything in <body>
  const host = target.closest("dialog[open]") ?? document.body;
  if (t.parentElement !== host) host.append(t);
  anchor?.removeAttribute("aria-describedby");
  anchor = target;
  t.textContent = text;
  place(target, t);
  t.classList.remove("opacity-0");
  target.setAttribute("aria-describedby", t.id);
}

function hide() {
  clearTimeout(timer);
  if (anchor) hiddenAt = Date.now();
  anchor?.removeAttribute("aria-describedby");
  anchor = null;
  tip?.classList.add("opacity-0");
}

function onEnter(e: Event) {
  const target = e.currentTarget as HTMLElement;
  clearTimeout(timer);
  if (anchor || Date.now() - hiddenAt < DELAY) show(target);
  else timer = window.setTimeout(() => show(target), DELAY);
}

// The tooltip is fixed-position, so it would drift off its anchor on scroll.
if (typeof window !== "undefined") {
  window.addEventListener("scroll", hide, { capture: true, passive: true });
  window.addEventListener("keydown", (e) => e.key === "Escape" && hide());
}

export const vTooltip: Directive<HTMLElement, string | null | undefined> = {
  mounted(el, { value }) {
    if (value) texts.set(el, value);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("focusin", onEnter);
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focusout", hide);
  },
  updated(el, { value }) {
    if (value) texts.set(el, value);
    else texts.delete(el);
    if (anchor === el) show(el);
  },
  beforeUnmount(el) {
    if (anchor === el) hide();
    el.removeEventListener("mouseenter", onEnter);
    el.removeEventListener("focusin", onEnter);
    el.removeEventListener("mouseleave", hide);
    el.removeEventListener("focusout", hide);
  },
};
