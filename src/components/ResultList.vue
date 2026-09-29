<script setup lang="ts">
import { computed, nextTick, reactive, useTemplateRef } from "vue";
import EntryCard from "./EntryCard.vue";
import EntryRow from "./EntryRow.vue";
import FranchiseGraph from "./FranchiseGraph.vue";
import { useLocator } from "../composables/useLocator";
import { useSettings, type ResultView } from "../composables/useSettings";
import { vTooltip } from "../directives/tooltip";

const { state, franchises, visible } = useLocator();
const { settings, excludeFranchise } = useSettings();
const total = computed(() =>
  visible.value.reduce((n, f) => n + f.suggestions.length, 0),
);

// franchises currently showing their relation graph instead of entries
const graphs = reactive(new Set<number>());
const toggleGraph = (key: number) =>
  graphs.has(key) ? graphs.delete(key) : graphs.add(key);

const bar = useTemplateRef("bar");
const articles = useTemplateRef("articles");

// Switching layout changes every franchise's height, so the page would jump.
// Keep the franchise at the top of the view where it was.
async function setView(view: ResultView) {
  if (settings.view === view) return;
  const barBottom = bar.value?.getBoundingClientRect().bottom ?? 0;
  const anchor = articles.value?.find(
    (a) => a.getBoundingClientRect().bottom > barBottom,
  );
  const before = anchor?.getBoundingClientRect().top;
  settings.view = view;
  if (!anchor || before === undefined) return;
  await nextTick();
  window.scrollBy(0, anchor.getBoundingClientRect().top - before);
}

const toggleClass =
  "rounded-full px-3.5 py-1 text-[13px] text-muted transition-colors duration-150 hover:text-ink aria-pressed:bg-surface aria-pressed:font-bold aria-pressed:text-ink";
</script>

<template>
  <section>
    <div
      v-if="state.phase === 'idle' && !franchises.length"
      class="max-w-[52ch] py-10 text-[17px] text-muted"
    >
      <p>
        Enter an AniList or MyAnimeList username to see every sequel, movie, OVA
        and odd little extra connected to what you've watched.
      </p>
    </div>
    <div
      v-else-if="state.phase === 'done' && !visible.length"
      class="max-w-[52ch] py-10 text-[17px] text-muted"
    >
      <p v-if="franchises.length">
        Your filters hide everything. Loosen them to see results.
      </p>
      <p v-else>
        You're caught up. Nothing related to your watched list is missing.
      </p>
    </div>

    <!-- pinned below the sticky header (see App.vue) so the layout can be
         switched mid-scroll; the header isn't sticky on narrow screens -->
    <div
      v-if="visible.length"
      ref="bar"
      class="sticky top-(--header-h) z-5 mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-paper py-2 text-muted max-[820px]:top-0"
    >
      <p>{{ total }} entries across {{ visible.length }} franchises</p>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <select
          v-model="settings.sort"
          class="field py-1 text-[13px] text-ink"
          aria-label="Sort franchises"
        >
          <option value="title-asc">Title, A to Z</option>
          <option value="title-desc">Title, Z to A</option>
          <option value="count-asc">Fewest entries first</option>
          <option value="count-desc">Most entries first</option>
        </select>
        <div
          class="inline-flex rounded-full bg-ink/6 p-0.75"
          role="group"
          aria-label="Layout"
        >
          <button
            type="button"
            :class="toggleClass"
            :aria-pressed="settings.view === 'cards'"
            @click="setView('cards')"
          >
            Cards
          </button>
          <button
            type="button"
            :class="toggleClass"
            :aria-pressed="settings.view === 'list'"
            @click="setView('list')"
          >
            List
          </button>
        </div>
      </div>
    </div>

    <article v-for="fr in visible" :key="fr.key" ref="articles" class="mb-10">
      <header class="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2
          class="basis-full font-display text-[1.35rem] leading-[1.2] font-extrabold"
        >
          {{ fr.title }}
        </h2>
        <!-- The one loud element: a franchise's watch progress as a string of beads.
             One dot per entry: filled = watched, open = still to find. -->
        <div class="flex max-w-full flex-wrap gap-1.25" aria-hidden="true">
          <span
            v-for="w in fr.watched"
            :key="w.id"
            class="size-2.75 rounded-full border-2 border-seen bg-seen"
            v-tooltip="`Watched: ${w.title}`"
          />
          <span
            v-for="s in fr.suggestions"
            :key="s.media.id"
            class="size-2.75 rounded-full border-2 border-accent"
            v-tooltip="`Not watched: ${s.media.title}`"
          />
        </div>
        <span class="text-[13px] text-muted">
          {{ fr.watched.length }} of
          {{ fr.watched.length + fr.suggestions.length }} watched
        </span>
        <button
          type="button"
          class="btn-link"
          :aria-pressed="graphs.has(fr.key)"
          @click="toggleGraph(fr.key)"
        >
          {{ graphs.has(fr.key) ? "Show entries" : "Show graph" }}
        </button>
        <button
          type="button"
          class="btn-link"
          @click="excludeFranchise(fr.key)"
        >
          Hide franchise
        </button>
      </header>
      <FranchiseGraph v-if="graphs.has(fr.key)" :fr="fr" />
      <ul
        v-else-if="settings.view === 'list'"
        class="overflow-hidden rounded-[10px] bg-surface"
      >
        <EntryRow v-for="s in fr.suggestions" :key="s.media.id" :s="s" />
      </ul>
      <ul
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3"
      >
        <EntryCard v-for="s in fr.suggestions" :key="s.media.id" :s="s" />
      </ul>
    </article>
  </section>
</template>
