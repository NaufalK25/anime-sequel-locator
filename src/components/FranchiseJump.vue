<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from "vue";
import type { Franchise } from "../core/franchises";
import { titleOf } from "../composables/useSettings";

// A searchable table of contents: type to narrow the franchises, pick one to
// jump there. Follows the ARIA combobox pattern (focus stays in the input,
// the highlighted option is announced through aria-activedescendant).
const props = defineProps<{ franchises: Franchise[] }>();
const emit = defineEmits<{ jump: [key: number] }>();

const id = useId();
const query = ref("");
const open = ref(false);
const active = ref(0);
const list = useTemplateRef("list");

// matches either title, whichever language is shown
const matches = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.franchises;
  return props.franchises.filter(
    (fr) =>
      fr.main.title.toLowerCase().includes(q) ||
      !!fr.main.titleEnglish?.toLowerCase().includes(q),
  );
});

watch(matches, () => (active.value = 0));

// keep the highlighted option in view while moving with the arrow keys
watch(active, async (i) => {
  await nextTick();
  list.value
    ?.querySelector(`#${CSS.escape(`${id}-${i}`)}`)
    ?.scrollIntoView({ block: "nearest" });
});

function show() {
  if (open.value) return;
  open.value = true;
  active.value = 0;
}

function pick(fr: Franchise | undefined) {
  if (!fr) return;
  open.value = false;
  query.value = "";
  emit("jump", fr.key);
}

function onKeydown(e: KeyboardEvent) {
  const n = matches.value.length;
  switch (e.key) {
    case "ArrowDown":
    case "ArrowUp":
      e.preventDefault();
      if (!open.value) show();
      else if (n)
        active.value =
          (active.value + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      return;
    // Home/End move the text cursor unless the list is open
    case "Home":
    case "End":
      if (!open.value || !n) return;
      e.preventDefault();
      active.value = e.key === "Home" ? 0 : n - 1;
      return;
    case "Enter":
      if (!open.value) return;
      e.preventDefault();
      pick(matches.value[active.value]);
      return;
    // first press closes the list, a second one clears the text
    case "Escape":
      e.preventDefault();
      if (open.value) open.value = false;
      else query.value = "";
      return;
  }
}

// close when focus leaves the widget, but not when it moves inside it
function onFocusOut(e: FocusEvent) {
  const root = e.currentTarget as HTMLElement;
  if (!root.contains(e.relatedTarget as Node | null)) open.value = false;
}
</script>

<template>
  <div class="relative max-w-full min-w-0 basis-60" @focusout="onFocusOut">
    <input
      v-model="query"
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      class="field w-full py-1.5 text-ink placeholder:text-muted"
      placeholder="Jump to franchise…"
      aria-label="Jump to franchise"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-activedescendant="
        open && matches.length ? `${id}-${active}` : undefined
      "
      @click="show"
      @input="show"
      @keydown="onKeydown"
    />
    <ul
      v-show="open"
      :id="`${id}-list`"
      ref="list"
      role="listbox"
      aria-label="Franchises"
      class="absolute inset-x-0 top-full z-10 mt-1 max-h-[min(60vh,420px)] overflow-y-auto rounded-[10px] border border-line bg-surface p-1 text-ink shadow-lg shadow-ink/18"
    >
      <!-- mousedown is prevented so the input keeps focus while picking -->
      <li
        v-for="(fr, i) in matches"
        :id="`${id}-${i}`"
        :key="fr.key"
        role="option"
        :aria-selected="i === active"
        class="cursor-pointer rounded-md px-2.5 py-1.5 aria-selected:bg-accent/16"
        @mousedown.prevent
        @mousemove="active = i"
        @click="pick(fr)"
      >
        {{ titleOf(fr.main) }}
        <span class="text-muted">({{ fr.suggestions.length }})</span>
      </li>
      <li v-if="!matches.length" class="px-2.5 py-1.5 text-muted">
        No franchise matches "{{ query.trim() }}".
      </li>
    </ul>
  </div>
</template>
