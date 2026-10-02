<script lang="ts">
import { shallowRef } from "vue";

// one poster's details open at a time, across every franchise
const current = shallowRef<symbol | null>(null);
</script>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { label } from "../core/labels";
import { otherTitleOf, titleOf, useSettings } from "../composables/useSettings";
import type { Suggestion } from "../core/franchises";
import { vTooltip } from "../directives/tooltip";

const props = defineProps<{ s: Suggestion }>();
const { excludeMedia } = useSettings();
const m = props.s.media;

const GAP = 8; // px between poster and details
const MARGIN = 8; // px kept clear of the viewport edges

// Only the medium cover is fetched, which is blurry at poster size. AniList
// keeps the large one under the same file name, so swap the folder; fall back
// to the medium one if that ever fails.
const src = ref(m.cover?.replace("/cover/medium/", "/cover/large/") ?? null);
const onError = () => {
  if (src.value !== m.cover) src.value = m.cover;
};

// Hovering shows only the title (a tooltip, so neighbouring posters stay in
// view); clicking or tapping the poster opens the details beside it. They
// close on a second click, Esc, or when focus or a click goes elsewhere.
const self = Symbol();
const open = computed(() => current.value === self);
const root = useTemplateRef("root");
const poster = useTemplateRef("poster");
const peek = useTemplateRef("peek");
const pos = ref<{ left: number; top: number } | null>(null);

function hide() {
  if (current.value === self) current.value = null;
}
const toggle = () => (open.value ? hide() : (current.value = self));

function onFocusOut(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node | null)) hide();
}
function onEscape() {
  hide();
  poster.value?.focus();
}

// Beside the poster (right, else left), or below/above it on narrow screens,
// always kept inside the viewport. Fixed-position, so it escapes the poster's
// overflow clipping; re-placed on scroll and resize.
function place() {
  const a = root.value?.getBoundingClientRect();
  const p = peek.value;
  if (!a || !p) return;
  const { width, height } = p.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  let left: number;
  let top = a.top;
  if (a.right + GAP + width <= vw - MARGIN) left = a.right + GAP;
  else if (a.left - GAP - width >= MARGIN) left = a.left - GAP - width;
  else {
    left = a.left + a.width / 2 - width / 2;
    top = a.bottom + GAP;
    if (top + height > vh - MARGIN) top = a.top - GAP - height;
  }
  pos.value = {
    left: Math.max(MARGIN, Math.min(left, vw - width - MARGIN)),
    top: Math.max(MARGIN, Math.min(top, vh - height - MARGIN)),
  };
}

let frame = 0;
const schedulePlace = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(place);
};

watch(open, async (o) => {
  if (o) {
    pos.value = null;
    await nextTick();
    place();
    window.addEventListener("scroll", schedulePlace, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedulePlace);
  } else {
    window.removeEventListener("scroll", schedulePlace, { capture: true });
    window.removeEventListener("resize", schedulePlace);
  }
});

// e.g. after Hide: don't leave the shared state pointing at a gone poster
onBeforeUnmount(() => {
  hide();
  cancelAnimationFrame(frame);
  window.removeEventListener("scroll", schedulePlace, { capture: true });
  window.removeEventListener("resize", schedulePlace);
});
</script>

<template>
  <!-- Poster grid: just the cover; clicking it pops the details up beside it. -->
  <li
    ref="root"
    class="relative aspect-23/32 overflow-hidden rounded-[10px] border-b-[3px] border-accent bg-line"
    :class="{ 'border-dashed': m.status === 'NOT_YET_RELEASED' }"
    @focusout="onFocusOut"
    @keydown.esc="onEscape"
  >
    <button
      ref="poster"
      type="button"
      class="block size-full"
      :aria-expanded="open"
      :aria-label="titleOf(m)"
      v-tooltip="open ? null : titleOf(m)"
      @click="toggle"
    >
      <img
        v-if="src"
        class="size-full object-cover"
        :src="src"
        alt=""
        loading="lazy"
        @error="onError"
      />
      <!-- no cover: the title is all there is to show -->
      <span
        v-else
        class="grid size-full place-items-center p-2.5 text-center text-[13px] font-bold text-muted"
      >
        {{ titleOf(m) }}
      </span>
    </button>

    <span
      v-if="s.listStatus"
      class="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-paper/90 px-1.5 py-0.5 text-[11px] font-bold text-seen"
      >{{ label(s.listStatus) }}</span
    >

    <!-- inside the poster in the DOM, so Tab goes from a poster into its
         details and then on to the next poster -->
    <div
      v-if="open"
      ref="peek"
      tabindex="-1"
      class="fixed top-0 left-0 z-30 flex w-90 max-w-[calc(100vw-16px)] cursor-auto gap-3 rounded-xl border border-l-[3px] border-line border-l-accent bg-surface p-3 shadow-lg shadow-ink/18 focus:outline-none"
      :class="{
        '[border-left-style:dashed]': m.status === 'NOT_YET_RELEASED',
        invisible: !pos,
      }"
      :style="pos && { transform: `translate(${pos.left}px, ${pos.top}px)` }"
    >
      <img
        v-if="src"
        class="aspect-23/32 w-26 shrink-0 self-start rounded-md bg-line object-cover"
        :src="src"
        alt=""
      />
      <div class="flex min-w-0 flex-col gap-0.5">
        <a
          :href="m.siteUrl"
          target="_blank"
          rel="noopener"
          class="text-[15px] leading-[1.3] font-bold hover:underline"
          >{{ titleOf(m) }}</a
        >
        <p v-if="otherTitleOf(m)" class="text-[13px] text-muted">
          {{ otherTitleOf(m) }}
        </p>
        <p class="text-[13px] text-muted [&>span+span]:before:content-[',_']">
          <span v-if="m.format">{{ label(m.format) }}</span>
          <span v-if="m.seasonYear">{{ m.seasonYear }}</span>
          <span v-if="m.episodes">{{ m.episodes }} ep</span>
          <span v-if="m.status && m.status !== 'FINISHED'">{{
            label(m.status)
          }}</span>
        </p>
        <p class="text-[13px] text-muted">
          {{ label(s.relation) }} of {{ s.from ? titleOf(s.from) : "?" }}
        </p>
        <p v-if="s.listStatus" class="text-[13px] font-bold text-seen">
          On your list: {{ label(s.listStatus) }}
        </p>
        <div class="mt-auto flex gap-3.5 pt-1.5 text-[13px]">
          <a
            v-if="m.idMal"
            class="underline"
            :href="`https://myanimelist.net/anime/${m.idMal}`"
            target="_blank"
            rel="noopener"
            >MAL</a
          >
          <button type="button" class="btn-link" @click="excludeMedia(m.id)">
            Hide
          </button>
        </div>
      </div>
    </div>
  </li>
</template>
