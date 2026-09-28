<script setup lang="ts">
import UserForm from "./components/UserForm.vue";
import FilterPanel from "./components/FilterPanel.vue";
import ResultList from "./components/ResultList.vue";
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 pt-6 pb-16">
    <header>
      <h1
        class="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)] leading-none font-extrabold tracking-[-0.02em]"
      >
        Sequel Locator
      </h1>
      <UserForm />
    </header>
    <div class="mt-7 grid grid-cols-[290px_1fr] gap-8 max-[820px]:grid-cols-1">
      <aside><FilterPanel /></aside>
      <main><ResultList /></main>
    </div>
  </div>
</template>
