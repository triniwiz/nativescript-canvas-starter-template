<script lang="ts" setup>
import { ref, $navigateBack } from 'nativescript-vue';

// Class names must appear in full so Tailwind can find them.
const justifyOptions = [
  { label: 'Start', value: 'justify-start' },
  { label: 'Center', value: 'justify-center' },
  { label: 'Between', value: 'justify-between' },
  { label: 'End', value: 'justify-end' },
];
const justify = ref(justifyOptions[2].value);

const directionOptions = [
  { label: 'Row', value: 'flex-row' },
  { label: 'Column', value: 'flex-col' },
];
const direction = ref(directionOptions[0].value);

const tiles = [
  { title: 'Featured', span: 'col-span-2 row-span-2', color: 'bg-indigo-500' },
  { title: 'Inbox', span: '', color: 'bg-violet-500' },
  { title: 'Photos', span: '', color: 'bg-fuchsia-500' },
  { title: 'Analytics', span: 'col-span-2', color: 'bg-sky-500' },
  { title: 'Music', span: '', color: 'bg-emerald-500' },
  { title: 'Notes', span: 'row-span-2', color: 'bg-amber-500' },
  { title: 'Maps', span: '', color: 'bg-rose-500' },
  { title: 'Weather', span: 'col-span-2', color: 'bg-teal-500' },
];

const allTags = [
  'Flexbox',
  'Grid',
  'Gap',
  'Wrap',
  'Aspect ratio',
  'Min / max',
  'Auto margins',
  'Spans',
  'Dark mode',
  'Semantic HTML',
  'Tailwind',
  'Taffy',
];
const tagCount = ref(6);

const palette = [
  { name: 'Slate', color: 'bg-slate-500' },
  { name: 'Red', color: 'bg-red-500' },
  { name: 'Orange', color: 'bg-orange-500' },
  { name: 'Amber', color: 'bg-amber-500' },
  { name: 'Lime', color: 'bg-lime-500' },
  { name: 'Emerald', color: 'bg-emerald-500' },
  { name: 'Teal', color: 'bg-teal-500' },
  { name: 'Sky', color: 'bg-sky-500' },
  { name: 'Indigo', color: 'bg-indigo-500' },
  { name: 'Violet', color: 'bg-violet-500' },
  { name: 'Fuchsia', color: 'bg-fuchsia-500' },
  { name: 'Rose', color: 'bg-rose-500' },
];

function segmentClass(active: boolean) {
  return active
    ? 'bg-indigo-500 text-white'
    : 'bg-slate-100 text-slate-700 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-300';
}
</script>

<template>
  <Page actionBarHidden="true">
    <Scroll>
      <main class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8">
        <!-- Header -->
        <header class="flex flex-row items-center gap-4">
          <button
            class="rounded-2xl bg-white px-4 py-2 text-base font-semibold text-indigo-600 active:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-300"
            @tap="$navigateBack"
          >
            ← Back
          </button>
          <div class="flex flex-1 flex-col">
            <span class="eyebrow">Playground</span>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
              Layout, live
            </h1>
          </div>
        </header>

        <!-- Flexbox -->
        <section class="card flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
              Flexbox
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Tap an option to swap the classes on the container below.
            </p>
          </div>

          <div class="flex flex-row flex-wrap gap-2">
            <button
              v-for="option in justifyOptions"
              :key="option.value"
              class="rounded-xl px-4 py-2 text-sm font-semibold"
              :class="segmentClass(justify === option.value)"
              @tap="justify = option.value"
            >
              {{ option.label }}
            </button>
            <button
              v-for="option in directionOptions"
              :key="option.value"
              class="rounded-xl px-4 py-2 text-sm font-semibold"
              :class="segmentClass(direction === option.value)"
              @tap="direction = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <div
            class="flex h-56 gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"
            :class="[justify, direction]"
          >
            <div
              v-for="n in 3"
              :key="n"
              class="flex size-14 items-center justify-center rounded-xl bg-indigo-500"
            >
              <span class="text-lg font-bold text-white">{{ n }}</span>
            </div>
          </div>

          <code class="text-sm text-indigo-600 dark:text-indigo-300">
            class="flex {{ direction }} {{ justify }} gap-3"
          </code>
        </section>

        <!-- Grid -->
        <section class="card flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
              CSS Grid
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              auto-fill columns with col-span and row-span. Resize the window
              to watch it reflow.
            </p>
          </div>

          <div
            class="grid grid-flow-row-dense grid-cols-[repeat(auto-fill,minmax(120,1fr))] auto-rows-[96] gap-3"
          >
            <div
              v-for="tile in tiles"
              :key="tile.title"
              class="flex flex-col justify-end rounded-2xl p-4"
              :class="[tile.span, tile.color]"
            >
              <span class="text-base font-semibold text-white">
                {{ tile.title }}
              </span>
            </div>
          </div>
        </section>

        <!-- Wrapping -->
        <section class="card flex flex-col gap-4">
          <div class="flex flex-row items-center gap-3">
            <div class="flex flex-1 flex-col gap-1">
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
                Wrapping
              </h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ tagCount }} of {{ allTags.length }} chips
              </p>
            </div>
            <button
              class="size-10 rounded-full text-lg font-bold"
              :class="segmentClass(false)"
              @tap="tagCount = Math.max(0, tagCount - 1)"
            >
              −
            </button>
            <button
              class="size-10 rounded-full bg-indigo-500 text-lg font-bold text-white active:bg-indigo-600"
              @tap="tagCount = Math.min(allTags.length, tagCount + 1)"
            >
              +
            </button>
          </div>

          <div class="flex flex-row flex-wrap gap-2">
            <span
              v-for="tag in allTags.slice(0, tagCount)"
              :key="tag"
              class="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
            >
              {{ tag }}
            </span>
          </div>
        </section>

        <!-- Palette -->
        <section class="card flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
              Palette
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Square swatches with aspect-square, straight from Tailwind's
              colour scale.
            </p>
          </div>

          <div class="grid grid-cols-[repeat(auto-fill,minmax(88,1fr))] gap-3">
            <div
              v-for="swatch in palette"
              :key="swatch.name"
              class="flex flex-col gap-2"
            >
              <div class="aspect-square w-full rounded-2xl" :class="swatch.color" />
              <span class="text-xs font-medium text-slate-600 dark:text-slate-400">
                {{ swatch.name }}
              </span>
            </div>
          </div>
        </section>
      </main>
    </Scroll>
  </Page>
</template>
