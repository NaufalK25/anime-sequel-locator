<script setup lang="ts">
import { useSettings } from "../composables/useSettings";
import { useLocator } from "../composables/useLocator";
import { malAvailable } from "../providers/mal";
import { vTooltip } from "../directives/tooltip";

const { settings } = useSettings();
const { state, run, cancel } = useLocator();

// dd/mm/yyyy hh:mm:ss, in local time
function formatFetchedAt(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  );
}
</script>

<template>
  <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="run">
    <div
      class="flex gap-3.5 text-muted"
      role="radiogroup"
      aria-label="List source"
    >
      <label
        ><input
          v-model="settings.source"
          class="accent-accent"
          type="radio"
          value="anilist"
        />
        AniList</label
      >
      <label v-tooltip="malAvailable ? '' : 'Set VITE_MAL_PROXY_URL to enable'">
        <input
          v-model="settings.source"
          class="accent-accent"
          type="radio"
          value="mal"
          :disabled="!malAvailable"
        />
        MyAnimeList
      </label>
    </div>
    <input
      v-model="settings.username"
      class="field min-w-55 flex-[0_1_280px] max-sm:min-w-0 max-sm:flex-[1_1_100%]"
      placeholder="Your username"
      autocomplete="username"
      spellcheck="false"
      required
    />
    <button
      v-if="state.phase !== 'running'"
      class="rounded-lg border border-accent bg-accent px-4 py-2.25 font-bold text-accent-contrast max-sm:flex-1"
      type="submit"
    >
      Find related anime
    </button>
    <button
      v-else
      type="button"
      class="rounded-lg border border-line bg-surface px-4 py-2.25 max-sm:flex-1"
      @click="cancel"
    >
      Stop
    </button>
    <p
      class="min-h-[1.5em] basis-full text-[14px]"
      :class="state.phase === 'error' ? 'text-error' : 'text-muted'"
      role="status"
    >
      {{ state.phase === "error" ? state.error : state.message }}
      <template v-if="state.phase === 'done' && state.fetchedAt">
        · Last fetch: {{ formatFetchedAt(state.fetchedAt) }}
      </template>
    </p>
  </form>
</template>
