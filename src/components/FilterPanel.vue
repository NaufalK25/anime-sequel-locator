<script setup lang="ts">
import { computed } from "vue";
import CheckGroup from "./CheckGroup.vue";
import HiddenPanel from "./HiddenPanel.vue";
import { AIRING, FORMATS, LIST_STATUSES, RELATIONS } from "../core/labels";
import { clearCache } from "../core/cache";
import { useSettings } from "../composables/useSettings";

const { settings, resetFilters } = useSettings();
const f = settings.filters;

const keywords = computed({
  get: () => f.titleExclude.join("\n"),
  set: (v: string) => (f.titleExclude = v.split("\n")),
});
</script>

<template>
  <!-- pinned below the sticky header (--header-h, set in App.vue) and scrolls
       on its own, so long result lists don't have to be scrolled first -->
  <div
    class="sticky top-(--header-h) flex max-h-[calc(100dvh-var(--header-h)-16px)] flex-col gap-4.5 overflow-y-auto overscroll-contain pr-1.5 max-[820px]:static max-[820px]:max-h-none max-[820px]:overflow-visible max-[820px]:pr-0"
  >
    <CheckGroup v-model="f.formats" legend="Formats" :options="FORMATS" />
    <CheckGroup
      v-model="f.relations"
      legend="Related by"
      :options="RELATIONS"
    />
    <CheckGroup v-model="f.airing" legend="Airing status" :options="AIRING" />
    <CheckGroup
      v-model="f.hideListStatuses"
      legend="Hide if on my list as"
      :options="LIST_STATUSES"
    />

    <label class="flex items-start gap-2">
      <input
        v-model="f.joinCrossovers"
        type="checkbox"
        class="mt-0.75 size-4 shrink-0 accent-accent"
      />
      <span>
        <span class="block text-[13px] font-bold"
          >Join series linked by a crossover</span
        >
        <span class="block text-[13px] text-muted"
          >When off, two series you've watched that share only a collab (a
          crossover, PV or spin-off) are shown as separate franchises, and the
          collab appears in both.</span
        >
      </span>
    </label>

    <label>
      <span class="field-label"
        >Show up to {{ f.maxDepth }}
        {{ f.maxDepth === 1 ? "hop" : "hops" }} from what I've watched</span
      >
      <input
        v-model.number="f.maxDepth"
        class="w-full accent-accent"
        type="range"
        min="1"
        :max="settings.crawlDepth"
      />
    </label>

    <label>
      <span class="field-label"
        >Stop following anime I've watched (a word from the title, one per
        line)</span
      >
      <textarea
        v-model="keywords"
        class="field w-full resize-y"
        rows="3"
        placeholder="naruto&#10;gintama"
      />
    </label>

    <HiddenPanel />
    <button type="button" class="btn-link" @click="resetFilters">
      Reset filters
    </button>

    <details
      class="flex flex-col border-t border-line pt-3.5 [&[open]>*+*]:mt-3.5"
    >
      <summary class="cursor-pointer font-bold">Search settings</summary>
      <p class="mt-2 text-[13px] text-muted">
        These change what gets fetched, so run the search again after editing.
      </p>
      <CheckGroup
        v-model="settings.watchedStatuses"
        legend="Count as watched"
        :options="LIST_STATUSES"
      />
      <CheckGroup
        v-model="settings.follow"
        legend="Follow these relations"
        :options="RELATIONS"
      />
      <label>
        <span class="field-label"
          >Walk up to {{ settings.crawlDepth }} hops</span
        >
        <input
          v-model.number="settings.crawlDepth"
          class="w-full accent-accent"
          type="range"
          min="1"
          max="8"
        />
      </label>
      <button type="button" class="btn-link" @click="clearCache()">
        Clear cached relations
      </button>
    </details>
  </div>
</template>
