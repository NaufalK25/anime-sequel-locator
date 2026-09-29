<script setup lang="ts">
import { label } from "../core/labels";
import { otherTitleOf, titleOf, useSettings } from "../composables/useSettings";
import { vTooltip } from "../directives/tooltip";
import type { Suggestion } from "../core/franchises";

const props = defineProps<{ s: Suggestion }>();
const { excludeMedia } = useSettings();
const m = props.s.media;
</script>

<template>
  <!-- Compact list view: one line per entry, no covers. -->
  <li
    class="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_auto_auto] items-baseline gap-x-4 gap-y-1 border-t border-l-[3px] border-accent border-t-line px-3 py-1.75 text-[13px] first:border-t-0 max-sm:grid-cols-[minmax(0,1fr)_auto]"
    :class="{ '[border-left-style:dashed]': m.status === 'NOT_YET_RELEASED' }"
  >
    <a
      :href="m.siteUrl"
      target="_blank"
      rel="noopener"
      class="truncate text-[14px] leading-[1.3] font-bold hover:underline max-sm:col-span-full max-sm:whitespace-normal"
      v-tooltip="otherTitleOf(m)"
      >{{ titleOf(m) }}</a
    >
    <span
      class="text-muted max-sm:col-start-1 [&>span+span]:before:content-[',_']"
    >
      <span v-if="m.format">{{ label(m.format) }}</span>
      <span v-if="m.seasonYear">{{ m.seasonYear }}</span>
      <span v-if="m.episodes">{{ m.episodes }} ep</span>
      <span v-if="m.status && m.status !== 'FINISHED'">{{
        label(m.status)
      }}</span>
    </span>
    <span class="truncate text-muted max-sm:col-start-1"
      >{{ label(s.relation) }} of {{ s.from ? titleOf(s.from) : "?" }}</span
    >
    <span
      v-if="s.listStatus"
      class="col-start-4 font-bold text-seen max-sm:col-start-1"
      >{{ label(s.listStatus) }}</span
    >
    <span
      class="col-start-5 flex gap-3.5 max-sm:col-start-2 max-sm:row-start-2"
    >
      <a
        v-if="m.idMal"
        class="underline"
        :href="`https://myanimelist.net/anime/${m.idMal}`"
        target="_blank"
        rel="noopener"
        >MAL</a
      >
      <button type="button" class="btn-link" @click="excludeMedia(m.id)">
        Hide
      </button>
    </span>
  </li>
</template>
