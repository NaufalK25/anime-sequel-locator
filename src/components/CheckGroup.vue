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
  <fieldset>
    <legend class="field-label">{{ legend }}</legend>
    <div class="flex flex-wrap gap-1.5">
      <!-- Chips read as checkboxes: a ticked box means the option is on. -->
      <button
        v-for="o in options"
        :key="o"
        type="button"
        class="inline-flex items-center gap-1.75 rounded-full border border-transparent bg-ink/6 py-1.25 pr-3 pl-2 text-[13px] text-muted transition duration-150 before:grid before:size-3.5 before:place-items-center before:rounded-full before:border-[1.5px] before:border-current/45 before:text-[10px] before:leading-none before:font-bold before:transition before:duration-150 before:content-[''] hover:bg-ink/11 hover:text-ink active:scale-96 aria-pressed:border-accent/35 aria-pressed:bg-accent/16 aria-pressed:text-ink aria-pressed:before:border-accent aria-pressed:before:bg-accent aria-pressed:before:text-accent-contrast aria-pressed:before:content-['✓'] aria-pressed:hover:bg-accent/24"
        :aria-pressed="model.includes(o)"
        @click="toggle(o)"
      >
        {{ label(o) }}
      </button>
    </div>
  </fieldset>
</template>
