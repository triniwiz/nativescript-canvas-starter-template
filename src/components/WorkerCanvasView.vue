<script lang="ts" setup>
import { onUnmounted, ref } from 'nativescript-vue';
import type { Canvas } from '@nativescript/canvas';
import { runInWorker, type TransferMode } from '../canvas/worker-host';

/**
 * CanvasView, drawn by a Worker: `worker` creates one whose entry file calls
 * `serveDemo` (see src/canvas/workers). Sizing and the slot work as in
 * CanvasView. The Worker ends when this component unmounts.
 */
const props = defineProps<{ worker: () => Worker; height?: number }>();
const emit = defineEmits<{ started: [mode: TransferMode] }>();

const error = ref<string | null>(null);
let stop: (() => void) | null = null;

function onLoaded(args: { object: Canvas }) {
  if (stop) {
    return;
  }
  stop = runInWorker(
    args.object,
    props.worker(),
    (mode) => emit('started', mode),
    (reason: any) => {
      error.value = String(reason?.message ?? reason);
    },
  );
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
