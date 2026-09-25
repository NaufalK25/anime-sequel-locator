<script setup lang="ts">
import { useSettings } from "../composables/useSettings";
import { useLocator } from "../composables/useLocator";
import { malAvailable } from "../providers/mal";

const { settings } = useSettings();
const { state, run, cancel } = useLocator();
</script>

<template>
  <form class="user-form" @submit.prevent="run">
    <div class="source" role="radiogroup" aria-label="List source">
      <label
        ><input v-model="settings.source" type="radio" value="anilist" />
        AniList</label
      >
      <label :title="malAvailable ? '' : 'Set VITE_MAL_PROXY_URL to enable'">
        <input
          v-model="settings.source"
          type="radio"
          value="mal"
          :disabled="!malAvailable"
        />
        MyAnimeList
      </label>
    </div>
    <input
      v-model="settings.username"
      class="username"
      placeholder="Your username"
      autocomplete="username"
      spellcheck="false"
      required
    />
    <button v-if="state.phase !== 'running'" class="primary" type="submit">
      Find related anime
    </button>
    <button v-else type="button" @click="cancel">Stop</button>
    <p class="status" role="status" :class="{ error: state.phase === 'error' }">
      {{ state.phase === "error" ? state.error : state.message }}
    </p>
  </form>
</template>
