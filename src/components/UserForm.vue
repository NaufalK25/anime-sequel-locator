<script setup lang="ts">
import { useSettings } from "../composables/useSettings";
import { useLocator } from "../composables/useLocator";
import { malAvailable } from "../providers/mal";

const { settings } = useSettings();
const { state, run, cancel } = useLocator();
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
      <label :title="malAvailable ? '' : 'Set VITE_MAL_PROXY_URL to enable'">
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
      class="field min-w-55 flex-[0_1_280px]"
      placeholder="Your username"
      autocomplete="username"
      spellcheck="false"
      required
    />
    <button
      v-if="state.phase !== 'running'"
      class="rounded-lg border border-accent bg-accent px-4 py-2.25 font-bold text-accent-contrast"
      type="submit"
    >
      Find related anime
    </button>
    <button
      v-else
      type="button"
      class="rounded-lg border border-line bg-surface px-4 py-2.25"
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
    </p>
  </form>
</template>
