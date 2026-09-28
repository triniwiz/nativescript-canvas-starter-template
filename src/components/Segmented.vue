<script lang="ts" setup generic="V extends string | number">
defineProps<{ options: readonly { label: string; value: V }[] }>();
const model = defineModel<V>({ required: true });
</script>

<template>
  <div class="flex flex-row flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="String(option.value)"
      class="rounded-xl px-4 py-2 text-sm font-semibold"
      :class="
        model === option.value
          ? 'bg-indigo-500 text-white'
          : 'bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
      "
      @tap="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
