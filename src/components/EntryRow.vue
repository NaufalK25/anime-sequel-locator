<script setup lang="ts">
import { label } from "../core/labels";
import { useSettings } from "../composables/useSettings";
import type { Suggestion } from "../core/franchises";

const props = defineProps<{ s: Suggestion }>();
const { excludeMedia } = useSettings();
const m = props.s.media;
</script>

<template>
  <li class="entry-row" :class="{ upcoming: m.status === 'NOT_YET_RELEASED' }">
    <a
      :href="m.siteUrl"
      target="_blank"
      rel="noopener"
      class="entry-title"
      :title="
        m.titleEnglish && m.titleEnglish !== m.title
          ? m.titleEnglish
          : undefined
      "
      >{{ m.title }}</a
    >
    <span class="facts">
      <span v-if="m.format">{{ label(m.format) }}</span>
      <span v-if="m.seasonYear">{{ m.seasonYear }}</span>
      <span v-if="m.episodes">{{ m.episodes }} ep</span>
      <span v-if="m.status && m.status !== 'FINISHED'">{{
        label(m.status)
      }}</span>
    </span>
    <span class="via">{{ label(s.relation) }} of {{ s.fromTitle }}</span>
    <span v-if="s.listStatus" class="on-list">{{ label(s.listStatus) }}</span>
    <span class="entry-actions">
      <a
        v-if="m.idMal"
        :href="`https://myanimelist.net/anime/${m.idMal}`"
        target="_blank"
        rel="noopener"
        >MAL</a
      >
      <button type="button" class="link" @click="excludeMedia(m.id)">
        Hide
      </button>
    </span>
  </li>
</template>
