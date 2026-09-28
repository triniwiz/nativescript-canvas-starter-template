<script lang="ts" setup>
import { $navigateBack } from 'nativescript-vue';

defineProps<{ eyebrow: string; title: string; description: string }>();
</script>

<template>
  <Page actionBarHidden="true">
    <Scroll>
      <main class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8">
        <header class="flex flex-row items-center gap-4">
          <button
            class="rounded-2xl bg-white px-4 py-2 text-base font-semibold text-indigo-600 active:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-300"
            @tap="$navigateBack"
          >
            ← Back
          </button>
          <div class="flex flex-1 flex-col">
            <span class="eyebrow">{{ eyebrow }}</span>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
              {{ title }}
            </h1>
          </div>
        </header>
        <p class="text-base text-slate-600 dark:text-slate-400">
          {{ description }}
        </p>
        <slot />
      </main>
    </Scroll>
  </Page>
</template>
