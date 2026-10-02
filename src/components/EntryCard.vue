<script setup lang="ts">
import { label } from "../core/labels";
import { otherTitleOf, titleOf, useSettings } from "../composables/useSettings";
import type { Suggestion } from "../core/franchises";
import { coverImage } from "../core/covers";

const props = defineProps<{ s: Suggestion }>();
const { excludeMedia } = useSettings();
const m = props.s.media;
const img = coverImage(m.cover);
</script>

<template>
  <li
    class="flex gap-3 rounded-[10px] border-l-[3px] border-accent bg-surface p-2.5"
    :class="{ '[border-left-style:dashed]': m.status === 'NOT_YET_RELEASED' }"
  >
    <img
      v-if="img"
      class="h-22.5 w-16 shrink-0 rounded-md bg-line object-cover"
      :src="img.src"
      :srcset="img.srcset"
      sizes="64px"
      alt=""
      loading="lazy"
    />
    <div v-else class="h-22.5 w-16 shrink-0 rounded-md bg-line" />
    <div class="flex min-w-0 flex-col gap-0.5">
      <a
        :href="m.siteUrl"
        target="_blank"
        rel="noopener"
        class="leading-[1.3] font-bold hover:underline"
        >{{ titleOf(m) }}</a
      >
      <p v-if="otherTitleOf(m)" class="text-[13px] text-muted">
        {{ otherTitleOf(m) }}
      </p>
      <p class="text-[13px] text-muted [&>span+span]:before:content-[',_']">
        <span v-if="m.format">{{ label(m.format) }}</span>
        <span v-if="m.seasonYear">{{ m.seasonYear }}</span>
        <span v-if="m.episodes">{{ m.episodes }} ep</span>
        <span v-if="m.status && m.status !== 'FINISHED'">{{
          label(m.status)
        }}</span>
      </p>
      <p class="text-[13px] text-muted">
        {{ label(s.relation) }} of {{ s.from ? titleOf(s.from) : "?" }}
      </p>
      <p v-if="s.listStatus" class="text-[13px] font-bold text-seen">
        On your list: {{ label(s.listStatus) }}
      </p>
      <div class="mt-auto flex gap-3.5 pt-1.5 text-[13px]">
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
      </div>
    </div>
  </li>
</template>
