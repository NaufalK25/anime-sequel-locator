<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import type { Franchise } from "../core/franchises";
import type { MediaNode } from "../types";
import { useLocator } from "../composables/useLocator";
import { titleOf, useSettings } from "../composables/useSettings";

// What the user hid with the Hide buttons, so it can be brought back all at
// once, one franchise at a time, or one entry at a time.
const { franchises } = useLocator();
const { settings, showMedia, showFranchise, clearExclusions } = useSettings();
const f = settings.filters;

// every member id to its franchise; a collab shown in several franchises
// goes to the first one, and a franchise's own key always wins
const owner = computed(() => {
  const map = new Map<number, Franchise>();
  for (const fr of franchises.value)
    for (const id of fr.memberIds) if (!map.has(id)) map.set(id, fr);
  for (const fr of franchises.value) map.set(fr.key, fr);
  return map;
});

const name = (fr: Franchise | undefined) =>
  fr ? titleOf(fr.main) : "Not in these results";

const hiddenFranchises = computed(() =>
  f.excludedFranchises
    .map((id) => ({ id, fr: owner.value.get(id) }))
    .sort((a, b) => sortByName(a.fr, b.fr)),
);

interface EntryGroup {
  key: number | null;
  fr: Franchise | undefined;
  items: { id: number; media: MediaNode | undefined }[];
}

// hidden entries grouped under the franchise they belong to
const entryGroups = computed(() => {
  const groups = new Map<number | null, EntryGroup>();
  for (const id of f.excludedMedia) {
    const fr = owner.value.get(id);
    const key = fr?.key ?? null;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, fr, items: [] }));
    g.items.push({ id, media: fr?.nodes.get(id) });
  }
  return [...groups.values()].sort((a, b) => sortByName(a.fr, b.fr));
});

// by title, with entries from another run last
function sortByName(a: Franchise | undefined, b: Franchise | undefined) {
  if (!a || !b) return Number(!a) - Number(!b);
  return name(a).localeCompare(name(b));
}

const total = computed(
  () => f.excludedMedia.length + f.excludedFranchises.length,
);

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const dialog = useTemplateRef("dialog");
// the content fills the dialog, so a click on the dialog itself hit the backdrop
function onDialogClick(e: MouseEvent) {
  if (e.target === dialog.value) dialog.value?.close();
}
</script>

<template>
  <!-- a summary here, the full list in a modal, so a long list doesn't push
       the search settings out of reach -->
  <div class="flex flex-col items-start gap-1 text-[13px] text-muted">
    <span
      >{{ plural(f.excludedMedia.length, "entry", "entries") }} and
      {{ plural(f.excludedFranchises.length, "franchise", "franchises") }}
      hidden</span
    >
    <span class="flex gap-3.5">
      <button
        type="button"
        class="btn-link"
        :disabled="!total"
        @click="dialog?.showModal()"
      >
        See hidden
      </button>
      <button
        type="button"
        class="btn-link"
        :disabled="!total"
        @click="clearExclusions"
      >
        Show all again
      </button>
    </span>
  </div>

  <dialog
    ref="dialog"
    class="m-auto max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-lg flex-col overflow-hidden rounded-xl bg-paper text-ink backdrop:bg-ink/40 open:flex"
    aria-label="Hidden entries and franchises"
    @click="onDialogClick"
  >
    <div
      class="flex items-center justify-between gap-4 border-b border-line px-4 py-3"
    >
      <h2 class="font-display text-[1.35rem] leading-[1.2] font-extrabold">
        Hidden
      </h2>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-line bg-surface px-4 py-2 font-bold"
        @click="dialog?.close()"
      >
        Close
      </button>
    </div>

    <div
      class="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-3 text-[13px]"
    >
      <p v-if="!total" class="text-muted">
        Nothing is hidden. Entries and franchises you hide show up here, so you
        can bring them back.
      </p>
      <button
        v-else
        type="button"
        class="btn-link self-start"
        @click="clearExclusions"
      >
        Show all again
      </button>

      <section v-if="hiddenFranchises.length">
        <h3 class="field-label">Franchises</h3>
        <ul class="flex flex-col gap-1">
          <li
            v-for="h in hiddenFranchises"
            :key="h.id"
            class="flex items-baseline justify-between gap-3"
          >
            <span class="min-w-0 truncate" :class="{ 'text-muted': !h.fr }">
              {{ name(h.fr) }}
            </span>
            <button
              type="button"
              class="btn-link shrink-0"
              @click="showFranchise(h.id)"
            >
              Show
            </button>
          </li>
        </ul>
      </section>

      <section v-if="entryGroups.length">
        <h3 class="field-label">Entries</h3>
        <div class="flex flex-col gap-2.5">
          <div v-for="g in entryGroups" :key="g.key ?? 'other'">
            <div class="flex items-baseline justify-between gap-3">
              <span
                class="min-w-0 truncate font-bold"
                :class="{ 'text-muted': !g.fr }"
                >{{ name(g.fr) }}</span
              >
              <button
                v-if="g.items.length > 1"
                type="button"
                class="btn-link shrink-0"
                @click="showMedia(g.items.map((i) => i.id))"
              >
                Show all {{ g.items.length }}
              </button>
            </div>
            <ul
              class="mt-0.5 flex flex-col gap-0.5 border-l border-line pl-2.5"
            >
              <li
                v-for="item in g.items"
                :key="item.id"
                class="flex items-baseline justify-between gap-3"
              >
                <a
                  :href="
                    item.media?.siteUrl ?? `https://anilist.co/anime/${item.id}`
                  "
                  target="_blank"
                  rel="noopener"
                  class="min-w-0 truncate hover:underline"
                  >{{
                    item.media ? titleOf(item.media) : `AniList #${item.id}`
                  }}</a
                >
                <button
                  type="button"
                  class="btn-link shrink-0"
                  @click="showMedia([item.id])"
                >
                  Show
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </dialog>
</template>
