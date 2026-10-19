<script lang="ts" setup>
import { onUnmounted, ref } from 'nativescript-vue';
import type { Canvas } from '@nativescript/canvas';
import { runInWorker, type TransferMode } from '../canvas/worker-host';

/**
 * CanvasView, drawn by a Worker: `worker` creates one whose entry file calls
 * `serveDemo` (see src/demos/offscreen). Sizing and the slot work as in
 * CanvasView. The Worker ends when this component unmounts.
 */
const props = defineProps<{ worker: () => Worker; height?: number }>();
const emit = defineEmits<{ started: [mode: TransferMode] }>();

const error = ref<string | null>(null);
let stop: (() => void) | null = null;

function showError(reason: any) {
  error.value = String(reason?.message ?? reason);
}

function onLoaded(args: { object: Canvas }) {
  if (stop) {
    return;
  }
  // `new Worker` throws if the runtime can't load the entry file. Left
  // uncaught, that escapes into the page's navigation and leaves the Frame
  // unable to go back.
  let worker: Worker;
  try {
    worker = props.worker();
  } catch (reason) {
    console.error('[canvas worker]', reason);
    showError(reason);
    return;
  }
  error.value = null;
  stop = runInWorker(args.object, worker, (mode) => emit('started', mode), showError);
}

onUnmounted(() => {
  stop?.();
  stop = null;
});
</script>

<template>
  <div class="relative overflow-hidden" :style="props.height ? { height: props.height } : undefined">
    <div class="absolute inset-0">
      <Canvas :style="{ width: '100%', height: '100%' }" @loaded="onLoaded" />
    </div>
    <slot />
    <div
      v-if="error"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 p-6"
    >
      <span class="text-sm font-semibold text-rose-300">The Worker couldn't draw</span>
      <p class="text-center text-xs text-slate-400">{{ error }}</p>
    </div>
  </div>
</template>
