<script setup lang="ts">
import { computed } from "vue";
import CheckGroup from "./CheckGroup.vue";
import { AIRING, FORMATS, LIST_STATUSES, RELATIONS } from "../core/labels";
import { clearCache } from "../core/cache";
import { useSettings } from "../composables/useSettings";

const { settings, resetFilters, clearExclusions } = useSettings();
const f = settings.filters;

const keywords = computed({
  get: () => f.titleExclude.join("\n"),
  set: (v: string) => (f.titleExclude = v.split("\n")),
});
</script>

<template>
  <div class="filters">
    <input
      v-model="f.search"
      type="search"
      class="search"
      placeholder="Search titles"
    />

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

    <label class="range">
      <span
        >Show up to {{ f.maxDepth }}
        {{ f.maxDepth === 1 ? "hop" : "hops" }} from what I've watched</span
      >
      <input
        v-model.number="f.maxDepth"
        type="range"
        min="1"
        :max="settings.crawlDepth"
      />
    </label>

    <label class="stack">
      <span
        >Stop following anime I've watched (a word from the title, one per
        line)</span
      >
      <textarea v-model="keywords" rows="3" placeholder="naruto&#10;gintama" />
    </label>

    <div class="row">
      <span
        >{{ f.excludedMedia.length }} entries and
        {{ f.excludedFranchises.length }} franchises excluded</span
      >
      <button
        type="button"
        class="link"
        :disabled="!f.excludedMedia.length && !f.excludedFranchises.length"
        @click="clearExclusions"
      >
        Show them again
      </button>
    </div>
    <button type="button" class="link" @click="resetFilters">
      Reset filters
    </button>

    <details class="crawl">
      <summary>Search settings</summary>
      <p class="hint">
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
      <label class="range">
        <span>Walk up to {{ settings.crawlDepth }} hops</span>
        <input
          v-model.number="settings.crawlDepth"
          type="range"
          min="1"
          max="8"
        />
      </label>
      <button type="button" class="link" @click="clearCache()">
        Clear cached relations
      </button>
    </details>
  </div>
</template>
