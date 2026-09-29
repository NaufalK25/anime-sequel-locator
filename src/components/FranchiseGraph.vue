<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from "vue";
import { label } from "../core/labels";
import { layoutFranchise, type Cell } from "../core/graphLayout";
import type { Franchise, Suggestion } from "../core/franchises";
import type { RelationEdge } from "../types";
import { vTooltip } from "../directives/tooltip";
import { titleOf } from "../composables/useSettings";

const props = defineProps<{ fr: Franchise }>();

// node size and spacing in px
const W = 176;
const H = 58;
const GAP_X = 44;
const GAP_Y = 18;
const PAD = 20;

const left = (c: Cell) => PAD + c.col * (W + GAP_X);
const top = (c: Cell) => PAD + c.row * (H + GAP_Y);

// layout only depends on the franchise's shape, not the filters
const layout = computed(() => {
  const { memberIds, edges, nodes } = props.fr;
  return layoutFranchise(
    memberIds,
    edges,
    (id) => nodes.get(id)?.seasonYear ?? 9999,
  );
});

// entry under the pointer or keyboard focus; its relations are all drawn
const active = ref<number | null>(null);

// Full view: the legend and canvas teleport into a modal dialog
// letters and digits only, so it's always a valid "#id" selector for Teleport
const dialogId = `graph-${useId().replace(/\W/g, "")}`;
const dialog = useTemplateRef("dialog");
const full = ref(false);
async function openFull() {
  full.value = true;
  await nextTick();
  dialog.value?.showModal();
}
// the content fills the dialog, so a click on the dialog itself hit the backdrop
function onDialogClick(e: MouseEvent) {
  if (e.target === dialog.value) dialog.value?.close();
}
const cellOf = (id: number) => layout.value.cells.get(id)!;

const size = computed(() => {
  const cells = [...layout.value.cells.values()];
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  return {
    width: PAD * 2 + cols * W + (cols - 1) * GAP_X,
    height: PAD * 2 + rows * H + (rows - 1) * GAP_Y,
  };
});

type Kind = "watched" | "suggestion" | "hidden";

const nodes = computed(() => {
  const watched = new Set(props.fr.watched.map((w) => w.id));
  const shown = new Map<number, Suggestion>(
    props.fr.suggestions.map((s) => [s.media.id, s]),
  );
  return props.fr.memberIds.map((id) => {
    const m = props.fr.nodes.get(id)!;
    const s = shown.get(id);
    const kind: Kind = watched.has(id)
      ? "watched"
      : s
        ? "suggestion"
        : "hidden";
    const tip =
      kind === "watched"
        ? `Watched: ${titleOf(m)}`
        : s
          ? `Not watched: ${titleOf(m)}. ${label(s.relation)} of ${s.from ? titleOf(s.from) : "?"}`
          : `Hidden by your filters: ${titleOf(m)}`;
    return { m, kind, tip, cell: cellOf(id) };
  });
});

// Only sequels and the link each entry was hung under are drawn by default:
// those are always a step right or a bracket down, so they never cross.
// Other relations appear while one of their entries is active.
const hungUnder = (e: RelationEdge) => {
  const { anchors } = layout.value;
  if (anchors.get(e.to) === e.from) return e.from;
  if (anchors.get(e.from) === e.to) return e.to;
  return null;
};

// Brackets in one column sit side by side in the gutter. An anchor's children
// share one bracket (a spine), and spines whose rows overlap get separate
// lanes, shortest nearest the boxes, so no two ever run on top of each other.
const lanes = computed(() => {
  const spans = new Map<number, { col: number; from: number; to: number }>();
  for (const e of props.fr.edges) {
    const anchor = hungUnder(e);
    if (anchor === null) continue;
    const a = cellOf(anchor);
    const child = cellOf(anchor === e.from ? e.to : e.from);
    const s = spans.get(anchor) ?? { col: a.col, from: a.row, to: a.row };
    s.to = Math.max(s.to, child.row);
    spans.set(anchor, s);
  }
  const lane = new Map<number, number>();
  // lanes already used in each column, with the row spans using them
  const used = new Map<number, { lane: number; from: number; to: number }[]>();
  const sorted = [...spans].sort(
    ([, a], [, b]) => a.to - a.from - (b.to - b.from),
  );
  for (const [anchor, s] of sorted) {
    const inCol = used.get(s.col) ?? [];
    let l = 0;
    while (inCol.some((u) => u.lane === l && u.from <= s.to && s.from <= u.to))
      l++;
    inCol.push({ lane: l, from: s.from, to: s.to });
    used.set(s.col, inCol);
    lane.set(anchor, l);
  }
  // hover-only brackets go outside every spine in their column
  const outer = new Map<number, number>();
  for (const [col, inCol] of used)
    outer.set(col, Math.max(...inCol.map((u) => u.lane)) + 1);
  return { lane, outer };
});

const edges = computed(() =>
  props.fr.edges.map((e) => {
    const hung = hungUnder(e);
    const a = cellOf(e.from);
    const b = cellOf(e.to);
    let d: string;
    if (a.col === b.col) {
      // same column: a bracket through the gutter on the left
      const lane = Math.min(
        hung === null
          ? (lanes.value.outer.get(a.col) ?? 0)
          : lanes.value.lane.get(hung)!,
        4,
      );
      const x = left(a);
      d = `M${x} ${top(a) + H / 2}h${-8 - lane * 7}V${top(b) + H / 2}H${x}`;
    } else {
      const [l, r] = a.col < b.col ? [a, b] : [b, a];
      const x1 = left(l) + W;
      const x2 = left(r);
      const y1 = top(l) + H / 2;
      const y2 = top(r) + H / 2;
      const dx = (x2 - x1) / 2;
      d = `M${x1} ${y1}C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
    }
    // AniList reads "to is the <type> of from", e.g. "Side story of Season 1"
    const title = (id: number) => {
      const m = props.fr.nodes.get(id);
      return m ? titleOf(m) : "?";
    };
    const tip = `${title(e.to)}: ${label(e.type)} of ${title(e.from)}`;
    const sequel = e.type === "SEQUEL";
    return {
      key: `${e.from}-${e.to}`,
      ends: [e.from, e.to],
      d,
      tip,
      sequel,
      primary: sequel || hung !== null,
    };
  }),
);

const shownEdges = computed(() => {
  const id = active.value;
  return edges.value
    .filter((e) => e.primary || (id !== null && e.ends.includes(id)))
    .map((e) => ({
      ...e,
      state:
        id === null ? "idle" : e.ends.includes(id) ? "lit" : ("dim" as const),
    }));
});

// the active entry and everything related to it stay fully visible
const lit = computed(() => {
  const id = active.value;
  if (id === null) return null;
  const s = new Set([id]);
  for (const e of props.fr.edges) {
    if (e.from === id) s.add(e.to);
    if (e.to === id) s.add(e.from);
  }
  return s;
});

const kindClass: Record<Kind, string> = {
  watched: "border-seen",
  suggestion: "border-accent",
  hidden: "border-dashed border-line text-muted",
};
</script>

<template>
  <div>
    <!-- Full view is a modal dialog; the graph itself moves into it -->
    <dialog
      :id="dialogId"
      ref="dialog"
      class="m-auto h-[calc(100dvh-32px)] max-h-none w-[calc(100vw-32px)] max-w-none flex-col overflow-hidden rounded-xl bg-paper p-4 text-ink backdrop:bg-ink/40 open:flex"
      :aria-label="`Relation graph: ${titleOf(fr.main)}`"
      @click="onDialogClick"
      @close="full = false"
    >
      <div class="mb-3 flex items-center justify-between gap-4">
        <h2 class="font-display text-[1.35rem] leading-[1.2] font-extrabold">
          {{ titleOf(fr.main) }}
        </h2>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-line bg-surface px-4 py-2 font-bold"
          @click="dialog?.close()"
        >
          Close
        </button>
      </div>
    </dialog>
    <Teleport defer :to="`#${dialogId}`" :disabled="!full">
      <div
        class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted"
      >
        <span class="inline-flex items-center gap-1.5"
          ><span
            class="size-2.75 rounded-sm border-2 border-seen"
          />Watched</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span class="size-2.75 rounded-sm border-2 border-accent" />Not
          watched</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><span
            class="size-2.75 rounded-sm border-2 border-dashed border-line"
          />Hidden by your filters</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><svg width="24" height="6" aria-hidden="true">
            <path d="M0 3h24" class="stroke-muted stroke-[1.5]" /></svg
          >Sequel</span
        >
        <span class="inline-flex items-center gap-1.5"
          ><svg width="24" height="6" aria-hidden="true">
            <path
              d="M0 3h24"
              class="stroke-muted/60 [stroke-dasharray:4_4]"
            /></svg
          >Side story, movie, spin-off or other relation</span
        >
        <span
          >Hover an entry to show all its relations, or a line to see what it
          means.</span
        >
      </div>
      <!-- the button sits outside the scrolling box so it stays in the corner -->
      <div class="relative" :class="{ 'flex min-h-0 flex-1 flex-col': full }">
        <button
          v-if="!full"
          type="button"
          class="absolute top-2 right-4 z-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-bold shadow-md hover:border-accent"
          @click="openFull"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            class="fill-none stroke-current stroke-[1.75]"
            aria-hidden="true"
          >
            <path d="M8.5 1.5h4v4M5.5 12.5h-4v-4M12.5 1.5 8 6M1.5 12.5 6 8" />
          </svg>
          Full view
        </button>
        <div
          class="overflow-auto overscroll-contain rounded-[10px] border border-line"
          :class="full ? 'min-h-0 flex-1' : 'max-h-[70vh]'"
        >
          <div
            class="relative"
            :style="{ width: `${size.width}px`, height: `${size.height}px` }"
          >
            <svg
              class="absolute inset-0 fill-none"
              :width="size.width"
              :height="size.height"
              aria-hidden="true"
            >
              <g
                v-for="e in shownEdges"
                :key="e.key"
                class="group"
                :class="{ 'opacity-20': e.state === 'dim' }"
              >
                <path
                  :d="e.d"
                  class="group-hover:stroke-ink group-hover:stroke-2"
                  :class="[
                    e.sequel
                      ? 'stroke-muted stroke-[1.5]'
                      : 'stroke-muted/60 [stroke-dasharray:4_4]',
                    { 'stroke-ink! stroke-2!': e.state === 'lit' },
                  ]"
                />
                <!-- wide invisible copy so the thin line is easy to hover -->
                <path
                  :d="e.d"
                  class="stroke-transparent stroke-12"
                  v-tooltip="e.tip"
                />
              </g>
            </svg>
            <a
              v-for="n in nodes"
              :key="n.m.id"
              :href="n.m.siteUrl"
              target="_blank"
              rel="noopener"
              class="absolute flex flex-col justify-center rounded-lg border-2 bg-surface px-2.5 transition-opacity duration-150 hover:underline"
              :class="[
                kindClass[n.kind],
                { 'opacity-35': lit && !lit.has(n.m.id) },
              ]"
              :style="{
                left: `${left(n.cell)}px`,
                top: `${top(n.cell)}px`,
                width: `${W}px`,
                height: `${H}px`,
              }"
              v-tooltip="n.tip"
              @mouseenter="active = n.m.id"
              @mouseleave="active = null"
              @focus="active = n.m.id"
              @blur="active = null"
            >
              <span class="line-clamp-2 text-[13px] leading-tight font-bold">{{
                titleOf(n.m)
              }}</span>
              <span class="text-[11px] text-muted">
                {{ n.m.format ? label(n.m.format) : "?" }},
                {{ n.m.seasonYear ?? "no date" }}
              </span>
            </a>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
