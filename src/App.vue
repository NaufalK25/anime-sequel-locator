<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
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
onMounted(() => header.value && observer.observe(header.value));
onBeforeUnmount(() => observer.disconnect());
</script>

<template>
  <div
    class="mx-auto max-w-7xl px-5 pb-16"
    :style="{ '--header-h': `${headerHeight}px` }"
  >
    <header
      ref="header"
      class="sticky top-0 z-10 bg-paper pt-6 pb-7 max-[820px]:static"
    >
      <h1
        class="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)] leading-none font-extrabold tracking-[-0.02em]"
      >
        Sequel Locator
      </h1>
      <UserForm />
    </header>
    <div class="grid grid-cols-[290px_1fr] gap-8 max-[820px]:grid-cols-1">
      <aside><FilterPanel /></aside>
      <main><ResultList /></main>
    </div>
  </div>
</template>
