<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import UserForm from "./components/UserForm.vue";
import FilterPanel from "./components/FilterPanel.vue";
import ResultList from "./components/ResultList.vue";

// The header's height changes (status line, wrapping), and the filter panel
// pins itself right below it, so expose it as --header-h.
const header = ref<HTMLElement>();
const headerHeight = ref(0);
const observer = new ResizeObserver(() => {
  headerHeight.value = header.value?.offsetHeight ?? 0;
});

// Below 820px (matches Tailwind's max-[820px]) the filters leave the sidebar
// and open as a sheet, so results aren't pushed below a long panel.
const narrowQuery = window.matchMedia("(width < 820px)");
const narrow = ref(narrowQuery.matches);
const syncNarrow = () => (narrow.value = narrowQuery.matches);

const sheet = useTemplateRef("sheet");
const openFilters = () => sheet.value?.showModal();
const closeFilters = () => sheet.value?.close();
// the sheet's content fills it, so a click on the dialog itself hit the backdrop
function onSheetClick(e: MouseEvent) {
  if (e.target === sheet.value) closeFilters();
}

// "Back to top" appears once the page is scrolled past one screen.
const scrolledDown = ref(false);
const syncScrolled = () => (scrolledDown.value = window.scrollY > innerHeight);
function backToTop() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

onMounted(() => {
  if (header.value) observer.observe(header.value);
  narrowQuery.addEventListener("change", syncNarrow);
  window.addEventListener("scroll", syncScrolled, { passive: true });
  syncScrolled();
});
onBeforeUnmount(() => {
  observer.disconnect();
  narrowQuery.removeEventListener("change", syncNarrow);
  window.removeEventListener("scroll", syncScrolled);
});
</script>

<template>
  <div
    class="mx-auto max-w-7xl px-4 pb-16 sm:px-5 max-[820px]:pb-24"
    :style="{ '--header-h': `${headerHeight}px` }"
  >
    <header
      ref="header"
      class="sticky top-0 z-10 bg-paper pt-6 pb-7 max-[820px]:static max-sm:pt-5 max-sm:pb-5"
    >
      <h1
        class="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)] leading-none font-extrabold tracking-[-0.02em]"
      >
        Sequel Locator
      </h1>
      <UserForm />
    </header>
    <div
      class="grid grid-cols-1 gap-8 min-[820px]:grid-cols-[250px_1fr] min-[820px]:gap-6 min-[1024px]:grid-cols-[290px_1fr] min-[1024px]:gap-8"
    >
      <aside v-if="!narrow"><FilterPanel /></aside>
      <!-- min-w-0: a grid column never shrinks below its content by default,
           so a wide graph would stretch the page instead of scrolling -->
      <main class="min-w-0"><ResultList /></main>
    </div>

    <div class="fixed right-4 bottom-4 z-20 flex flex-col items-end gap-2.5">
      <button
        v-if="scrolledDown"
        type="button"
        class="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg"
        aria-label="Back to top"
        @click="backToTop"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <button
        v-if="narrow"
        type="button"
        class="rounded-full bg-ink px-5 py-3 font-bold text-paper shadow-lg"
        @click="openFilters"
      >
        Filters
      </button>
    </div>

    <template v-if="narrow">
      <dialog
        ref="sheet"
        class="my-0 mr-0 ml-auto h-dvh max-h-none w-full max-w-sm overscroll-contain bg-paper text-ink backdrop:bg-ink/40"
        aria-label="Filters"
        @click="onSheetClick"
      >
        <div class="min-h-full px-4 pb-6">
          <div
            class="sticky top-0 z-1 mb-2 flex items-center justify-between bg-paper py-3"
          >
            <h2 class="font-display text-[1.35rem] font-extrabold">Filters</h2>
            <button
              type="button"
              class="rounded-lg border border-line bg-surface px-4 py-2 font-bold"
              @click="closeFilters"
            >
              Done
            </button>
          </div>
          <FilterPanel />
        </div>
      </dialog>
    </template>
  </div>
</template>
