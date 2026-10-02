<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "../composables/useSettings";
import { useLocator } from "../composables/useLocator";
import { malAvailable } from "../providers/mal";
import { vTooltip } from "../directives/tooltip";

const { settings } = useSettings();
const { state, run, cancel } = useLocator();

// the typed user's profile on the chosen site; null until there's a name
const profileUrl = computed(() => {
  const name = encodeURIComponent(settings.username.trim());
  if (!name) return null;
  return settings.source === "mal"
    ? `https://myanimelist.net/profile/${name}`
    : `https://anilist.co/user/${name}/`;
});

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
    <!-- status on the left, the profile link pushed to the right -->
    <div
      class="flex basis-full flex-wrap items-start gap-x-4 gap-y-1 text-[14px]"
    >
      <p
        class="min-h-[1.5em]"
        :class="state.phase === 'error' ? 'text-error' : 'text-muted'"
        role="status"
      >
        {{ state.phase === "error" ? state.error : state.message }}
        <template v-if="state.phase === 'done' && state.fetchedAt">
          · Last fetch: {{ formatFetchedAt(state.fetchedAt) }}
        </template>
      </p>
      <a
        v-if="profileUrl"
        :href="profileUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-link ml-auto inline-flex items-center gap-1.5 hover:text-ink"
      >
        <!-- site logos from Simple Icons (CC0), one color so they follow the theme -->
        <svg
          viewBox="0 0 24 24"
          class="size-4.5 fill-current"
          aria-hidden="true"
        >
          <path
            v-if="settings.source === 'mal'"
            d="M14.921 6.479c-.82 0-3.683 0-4.947 3.156-.662 1.652-.986 4.812.876 7.886l1.934-1.41s-.767-1.095-1.083-3.191h2.897l.022 3.19h2.604V8.835h-2.581v2.043l-2.46-.023s.413-2.408 2.877-2.336h2.454l-.572-2.04ZM0 6.528v9.624h2.348v-5.84l2.031 2.664 2.047-2.652v5.828h2.336V6.528H6.437L4.368 9.474 2.31 6.528Zm18.447.022v9.583h5.022L24 14.09h-3.232V6.55Z"
          />
          <path
            v-else
            d="M24 17.53v2.421c0 .71-.391 1.101-1.1 1.101h-5l-.057-.165L11.84 3.736c.106-.502.46-.788 1.053-.788h2.422c.71 0 1.1.391 1.1 1.1v12.38H22.9c.71 0 1.1.392 1.1 1.101zM11.034 2.947l6.337 18.104h-4.918l-1.052-3.131H6.019l-1.077 3.131H0L6.361 2.948h4.673zm-.66 10.96-1.69-5.014-1.541 5.015h3.23z"
          />
        </svg>
        Open profile on
        {{ settings.source === "mal" ? "MyAnimeList" : "AniList" }}
        <svg
          viewBox="0 0 16 16"
          class="size-3.5 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
          aria-hidden="true"
        >
          <path d="M9 3h4v4M13 3 7 9M11 9.5V13H3V5h3.5" />
        </svg>
        <span class="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  </form>
</template>
