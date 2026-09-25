<script setup lang="ts">
import UserForm from "./components/UserForm.vue";
import FilterPanel from "./components/FilterPanel.vue";
import ResultList from "./components/ResultList.vue";
</script>

<template>
  <div class="shell">
    <header class="masthead">
      <h1>Sequel Locator</h1>
      <UserForm />
    </header>
    <div class="layout">
      <aside><FilterPanel /></aside>
      <main><ResultList /></main>
    </div>
  </div>
</template>
