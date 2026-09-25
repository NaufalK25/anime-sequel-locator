<script setup lang="ts">
import { label } from "../core/labels";
import { useSettings } from "../composables/useSettings";
import type { Suggestion } from "../core/franchises";

const props = defineProps<{ s: Suggestion }>();
const { excludeMedia } = useSettings();
const m = props.s.media;
</script>

<template>
  <li class="entry" :class="{ upcoming: m.status === 'NOT_YET_RELEASED' }">
    <img v-if="m.cover" :src="m.cover" alt="" loading="lazy" />
    <div v-else class="cover-missing" />
    <div class="entry-body">
      <a :href="m.siteUrl" target="_blank" rel="noopener" class="entry-title">{{
        m.title
      }}</a>
      <p v-if="m.titleEnglish && m.titleEnglish !== m.title" class="alt">
        {{ m.titleEnglish }}
      </p>
      <p class="facts">
        <span v-if="m.format">{{ label(m.format) }}</span>
        <span v-if="m.seasonYear">{{ m.seasonYear }}</span>
        <span v-if="m.episodes">{{ m.episodes }} ep</span>
        <span v-if="m.status && m.status !== 'FINISHED'">{{
          label(m.status)
        }}</span>
      </p>
      <p class="via">{{ label(s.relation) }} of {{ s.fromTitle }}</p>
      <p v-if="s.listStatus" class="on-list">
        On your list: {{ label(s.listStatus) }}
      </p>
      <div class="entry-actions">
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
      </div>
    </div>
  </li>
</template>
