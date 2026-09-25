<script setup lang="ts" generic="T extends string">
import { label } from "../core/labels";

defineProps<{ legend: string; options: readonly T[] }>();
const model = defineModel<T[]>({ required: true });

function toggle(v: T) {
  model.value = model.value.includes(v)
    ? model.value.filter((x) => x !== v)
    : [...model.value, v];
}
</script>

<template>
  <fieldset class="check-group">
    <legend>{{ legend }}</legend>
    <div class="chips">
      <button
        v-for="o in options"
        :key="o"
        type="button"
        class="chip"
        :aria-pressed="model.includes(o)"
        @click="toggle(o)"
      >
        {{ label(o) }}
      </button>
    </div>
  </fieldset>
</template>
