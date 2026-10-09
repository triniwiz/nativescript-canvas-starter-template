<script lang="ts" setup>
import { ref } from 'nativescript-vue';
import DemoPage from '../../components/DemoPage.vue';
import CanvasView from '../../components/CanvasView.vue';
import WorkerCanvasView from '../../components/WorkerCanvasView.vue';
import { fireflies } from './fireflies';
import { createFirefliesWorker } from './workers';
import type { TransferMode } from '../../canvas/worker-host';

const BLOCK_MS = 2000;

const mainDemo = fireflies();
const mode = ref<TransferMode>();

// Busy-waits, so nothing else runs on the main thread meanwhile: not its
// frames, not touch input, not this page's layout.
function blockMainThread() {
  const until = Date.now() + BLOCK_MS;
  while (Date.now() < until) {}
}

const sprite = `const glow = new OffscreenCanvas(64, 64);
glow.getContext('2d').fillRect(0, 0, 64, 64);
ctx.drawImage(glow, x, y, size, size);`;

const transfer = `// Main thread
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);
// Android and iOS, for now: send a handle
worker.postMessage({ handle: OffscreenCanvas._toHandle(offscreen) });

// The Worker
import '@nativescript/canvas/worker';
const canvas = data.canvas ?? OffscreenCanvas._fromHandle(data.handle);
canvas.getContext('2d');`;
</script>

<template>
  <DemoPage
    eyebrow="OffscreenCanvas"
    title="Off the main thread"
    description="The same fireflies, drawn twice: on the main thread, and by a Worker that owns the canvas through transferControlToOffscreen(). Block the main thread and only the Worker's copy keeps moving."
  >
    <section class="card flex flex-col gap-4">
      <div class="flex flex-row flex-wrap items-center justify-between gap-3">
        <div class="flex flex-1 basis-60 flex-col gap-1">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Main thread vs Worker</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Each canvas prints its own frame rate. Touch either one to draw the fireflies in.
          </p>
        </div>
        <button
          class="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white active:bg-rose-600"
          @tap="blockMainThread"
        >
          Block the main thread for 2 s
        </button>
      </div>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(280,1fr))] gap-4">
        <CanvasView :demo="mainDemo" :height="320" class="w-full rounded-2xl">
          <span
            class="absolute left-3 top-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white"
          >
            Main thread
          </span>
        </CanvasView>
        <WorkerCanvasView
          :worker="createFirefliesWorker"
          :height="320"
          class="w-full rounded-2xl"
          @started="mode = $event"
        >
          <div class="absolute left-3 top-3 flex flex-row gap-2">
            <span class="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
              Worker
            </span>
            <span
              v-if="mode"
              class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white"
            >
              {{ mode === 'transfer' ? 'postMessage transfer' : 'sent as a handle' }}
            </span>
          </div>
        </WorkerCanvasView>
      </div>
    </section>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(300,1fr))] gap-6">
      <section class="card flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">A canvas without a view</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Each glow is drawn once into an OffscreenCanvas, then stamped with drawImage, on either
          thread.
        </p>
        <code
          class="rounded-2xl bg-slate-100 p-4 text-sm text-indigo-600 dark:bg-slate-800 dark:text-indigo-300"
        >
          {{ sprite }}
        </code>
      </section>

      <section class="card flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Hand a view to a Worker</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          The view shows the Worker's frames, and resizing the OffscreenCanvas there resizes the view.
        </p>
        <code
          class="rounded-2xl bg-slate-100 p-4 text-sm text-indigo-600 dark:bg-slate-800 dark:text-indigo-300"
        >
          {{ transfer }}
        </code>
      </section>
    </div>
  </DemoPage>
</template>
