<script setup lang="ts">
import { computed, nextTick, reactive, useTemplateRef } from "vue";
import EntryCard from "./EntryCard.vue";
import EntryPoster from "./EntryPoster.vue";
import EntryRow from "./EntryRow.vue";
import FranchiseGraph from "./FranchiseGraph.vue";
import FranchiseJump from "./FranchiseJump.vue";
import { useLocator } from "../composables/useLocator";
import {
  titleOf,
  useSettings,
  type ResultView,
} from "../composables/useSettings";
import { vTooltip } from "../directives/tooltip";
import { smoothScrollTo } from "../composables/smoothScroll";

const { state, franchises, visible } = useLocator();
const { settings, excludeFranchise, showMedia } = useSettings();
const total = computed(() =>
  visible.value.reduce((n, f) => n + f.suggestions.length, 0),
);

// entries hidden with Hide in each shown franchise, so they can be restored there
const hiddenIn = computed(() => {
  const hidden = new Set(settings.filters.excludedMedia);
  return new Map(
    visible.value.map((fr) => [
      fr.key,
      fr.memberIds.filter((id) => hidden.has(id)),
    ]),
  );
});

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

// Scroll so the franchise starts just below the sticky bar. The bar's own
// position can't be used: before it sticks it sits lower than it will after.
function jumpTo(key: number) {
  const article = document.getElementById(`franchise-${key}`);
  const b = bar.value;
  if (!article || !b) return;
  // Move keyboard focus too, so Tab continues from that franchise.
  article.querySelector("h2")?.focus({ preventScroll: true });
  // measured every frame, so the scroll still lands if the layout shifts
  smoothScrollTo(() => {
    const stuckBottom = parseFloat(getComputedStyle(b).top) + b.offsetHeight;
    const y = article.getBoundingClientRect().top + window.scrollY;
    return y - stuckBottom - 12;
  });
}

const toggleClass =
  "grid size-7.5 place-items-center rounded-full text-muted transition-colors duration-150 hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink";
const iconClass =
  "size-4 fill-none stroke-current stroke-[1.6] [stroke-linecap:round]";
const glyphClass = "text-[15px] leading-none font-bold";
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
      v-else-if="state.phase === 'done' && !franchises.length"
      class="max-w-[52ch] py-10 text-[17px] text-muted"
    >
      <p>You're caught up. Nothing related to your watched list is missing.</p>
    </div>

    <!-- pinned below the sticky header (see App.vue) so the layout can be
         switched mid-scroll; the header isn't sticky on narrow screens -->
    <div
      v-if="franchises.length"
      ref="bar"
      class="sticky top-(--header-h) z-5 mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-paper py-2 text-muted max-[820px]:top-0"
    >
      <div class="flex basis-full flex-wrap gap-2">
        <input
          v-model="settings.filters.search"
          type="search"
          class="field min-w-0 grow basis-60 py-1.5 text-ink"
          placeholder="Search anime in your results"
          aria-label="Search anime in your results"
        />
        <!-- table of contents: every shown franchise, in the current order -->
        <FranchiseJump :franchises="visible" @jump="jumpTo" />
      </div>
      <p>{{ total }} entries across {{ visible.length }} franchises</p>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <select
          v-model="settings.sort"
          class="field picker py-1 text-[13px] text-ink"
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
            :aria-pressed="settings.view === 'posters'"
            aria-label="Posters"
            v-tooltip="'Posters: covers only, click one for details'"
            @click="setView('posters')"
          >
            <svg viewBox="0 0 16 16" :class="iconClass" aria-hidden="true">
              <rect x="1.5" y="1.75" width="3.5" height="5.5" rx="0.75" />
              <rect x="6.25" y="1.75" width="3.5" height="5.5" rx="0.75" />
              <rect x="11" y="1.75" width="3.5" height="5.5" rx="0.75" />
              <rect x="1.5" y="8.75" width="3.5" height="5.5" rx="0.75" />
              <rect x="6.25" y="8.75" width="3.5" height="5.5" rx="0.75" />
              <rect x="11" y="8.75" width="3.5" height="5.5" rx="0.75" />
            </svg>
          </button>
          <button
            type="button"
            :class="toggleClass"
            :aria-pressed="settings.view === 'cards'"
            aria-label="Cards"
            v-tooltip="'Cards: cover with details'"
            @click="setView('cards')"
          >
            <svg viewBox="0 0 16 16" :class="iconClass" aria-hidden="true">
              <rect x="2" y="2" width="4" height="5" rx="1" />
              <rect x="2" y="9" width="4" height="5" rx="1" />
              <path d="M8.5 3.5h5.5M8.5 5.5h3.5M8.5 10.5h5.5M8.5 12.5h3.5" />
            </svg>
          </button>
          <button
            type="button"
            :class="toggleClass"
            :aria-pressed="settings.view === 'list'"
            aria-label="List"
            v-tooltip="'List'"
            @click="setView('list')"
          >
            <svg viewBox="0 0 16 16" :class="iconClass" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </button>
        </div>
        <div
          class="inline-flex rounded-full bg-ink/6 p-0.75"
          role="group"
          aria-label="Titles"
        >
          <!-- あ / A: the usual glyph pair for Japanese vs English text -->
          <button
            type="button"
            :class="toggleClass"
            :aria-pressed="settings.titleLanguage === 'romaji'"
            aria-label="Japanese titles"
            v-tooltip="'Japanese titles in Latin letters (romaji)'"
            @click="settings.titleLanguage = 'romaji'"
          >
            <span :class="glyphClass" aria-hidden="true">あ</span>
          </button>
          <button
            type="button"
            :class="toggleClass"
            :aria-pressed="settings.titleLanguage === 'english'"
            aria-label="English titles"
            v-tooltip="'English titles, or the Japanese one if there is none'"
            @click="settings.titleLanguage = 'english'"
          >
            <span :class="glyphClass" aria-hidden="true">A</span>
          </button>
        </div>
      </div>
    </div>

    <!-- below the bar, so the search box stays put while nothing matches -->
    <div
      v-if="franchises.length && !visible.length"
      class="max-w-[52ch] py-10 text-[17px] text-muted"
    >
      <p v-if="settings.filters.search.trim()">
        No anime in your results matches "{{ settings.filters.search.trim() }}".
        Check the spelling, or clear the search.
      </p>
      <p v-else>Your filters hide everything. Loosen them to see results.</p>
    </div>

    <article
      v-for="fr in visible"
      :id="`franchise-${fr.key}`"
      :key="fr.key"
      ref="articles"
      class="mb-10"
    >
      <header class="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2
          tabindex="-1"
          class="basis-full font-display text-[1.35rem] leading-[1.2] font-extrabold focus:outline-none"
        >
          {{ titleOf(fr.main) }}
        </h2>
        <!-- The one loud element: a franchise's watch progress as a string of beads.
             One dot per entry: filled = watched, open = still to find. -->
        <div class="flex max-w-full flex-wrap gap-1.25" aria-hidden="true">
          <span
            v-for="w in fr.watched"
            :key="w.id"
            class="size-2.75 rounded-full border-2 border-seen bg-seen"
            v-tooltip="`Watched: ${titleOf(w)}`"
          />
          <span
            v-for="s in fr.suggestions"
            :key="s.media.id"
            class="size-2.75 rounded-full border-2 border-accent"
            v-tooltip="`Not watched: ${titleOf(s.media)}`"
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
        <button
          v-if="hiddenIn.get(fr.key)?.length"
          type="button"
          class="btn-link"
          @click="showMedia(hiddenIn.get(fr.key)!)"
        >
          Show {{ hiddenIn.get(fr.key)!.length }} hidden
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
        v-else-if="settings.view === 'posters'"
        class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 max-sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))]"
      >
        <EntryPoster v-for="s in fr.suggestions" :key="s.media.id" :s="s" />
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
