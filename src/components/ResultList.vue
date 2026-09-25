<script setup lang="ts">
import { computed } from "vue";
import EntryCard from "./EntryCard.vue";
import { useLocator } from "../composables/useLocator";
import { useSettings } from "../composables/useSettings";

const { state, franchises, visible } = useLocator();
const { excludeFranchise } = useSettings();
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

    <p v-if="visible.length" class="summary">
      {{ total }} entries across {{ visible.length }} franchises
    </p>

    <article v-for="fr in visible" :key="fr.key" class="franchise">
      <header>
        <h2>{{ fr.title }}</h2>
        <!-- one dot per entry: filled = watched, open = still to find -->
        <div
          class="rail"
          :aria-label="`${fr.watched.length} of ${fr.watched.length + fr.suggestions.length} watched`"
        >
          <span
            v-for="w in fr.watched"
            :key="w.id"
            class="dot seen"
            :title="w.title"
          />
          <span
            v-for="s in fr.suggestions"
            :key="s.media.id"
            class="dot"
            :title="s.media.title"
          />
        </div>
        <button type="button" class="link" @click="excludeFranchise(fr.key)">
          Hide franchise
        </button>
      </header>
      <ul class="entries">
        <EntryCard v-for="s in fr.suggestions" :key="s.media.id" :s="s" />
      </ul>
    </article>
  </section>
</template>
