<script setup lang="ts">
import { computed } from "vue";
import EntryCard from "./EntryCard.vue";
import EntryRow from "./EntryRow.vue";
import { useLocator } from "../composables/useLocator";
import { useSettings } from "../composables/useSettings";

const { state, franchises, visible } = useLocator();
const { settings, excludeFranchise } = useSettings();
const total = computed(() =>
  visible.value.reduce((n, f) => n + f.suggestions.length, 0),
);
</script>

<template>
  <section class="results">
    <div v-if="state.phase === 'idle' && !franchises.length" class="empty">
      <p>
        Enter an AniList or MyAnimeList username to see every sequel, movie, OVA
        and odd little extra connected to what you've watched.
      </p>
    </div>
    <div v-else-if="state.phase === 'done' && !visible.length" class="empty">
      <p v-if="franchises.length">
        Your filters hide everything. Widen them on the left.
      </p>
      <p v-else>
        You're caught up. Nothing related to your watched list is missing.
      </p>
    </div>

    <div v-if="visible.length" class="summary">
      <p>{{ total }} entries across {{ visible.length }} franchises</p>
      <div class="view-toggle" role="group" aria-label="Layout">
        <button
          type="button"
          :aria-pressed="settings.view === 'cards'"
          @click="settings.view = 'cards'"
        >
          Cards
        </button>
        <button
          type="button"
          :aria-pressed="settings.view === 'list'"
          @click="settings.view = 'list'"
        >
          List
        </button>
      </div>
    </div>

    <article v-for="fr in visible" :key="fr.key" class="franchise">
      <header>
        <h2>{{ fr.title }}</h2>
        <!-- one dot per entry: filled = watched, open = still to find -->
        <div class="rail" aria-hidden="true">
          <span
            v-for="w in fr.watched"
            :key="w.id"
            class="dot seen"
            :title="`Watched: ${w.title}`"
          />
          <span
            v-for="s in fr.suggestions"
            :key="s.media.id"
            class="dot"
            :title="`Not watched: ${s.media.title}`"
          />
        </div>
        <span class="rail-count">
          {{ fr.watched.length }} of
          {{ fr.watched.length + fr.suggestions.length }} watched
        </span>
        <button type="button" class="link" @click="excludeFranchise(fr.key)">
          Hide franchise
        </button>
      </header>
      <ul v-if="settings.view === 'list'" class="entry-list">
        <EntryRow v-for="s in fr.suggestions" :key="s.media.id" :s="s" />
      </ul>
      <ul v-else class="entries">
        <EntryCard v-for="s in fr.suggestions" :key="s.media.id" :s="s" />
      </ul>
    </article>
  </section>
</template>
