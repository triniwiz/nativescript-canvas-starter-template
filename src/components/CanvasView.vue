<script lang="ts" setup generic="T extends DemoInstance">
import { onUnmounted, ref } from 'nativescript-vue';
import type { Canvas } from '@nativescript/canvas';
import { runDemo, type Demo, type DemoInstance } from '../canvas/runner';

/**
 * A <Canvas> that runs a demo from src/canvas/demos, filling the width it is
 * given. With `height` (dp) it is that tall; without, it fills the height its
 * box gets from classes (`flex-1`, `h-*`). The default slot is layered on top
 * of the canvas, so MasonKit content (badges, captions, controls) can sit over
 * the drawing.
 *
 * The canvas sits in an absolutely positioned box, so like any out-of-flow
 * content it adds nothing to its container's size. In flow, its backing store
 * would be its intrinsic size (as on the web), and a flex item's automatic
 * minimum height would grow with every resize the runner makes to match it.
 *
 * The size is set on the canvas as a style, not with classes: the canvas sets
 * its own width/height as local style values, which outrank class rules.
 */
const props = defineProps<{ demo: Demo<T>; height?: number }>();
const emit = defineEmits<{ started: [instance: T] }>();

const error = ref<string | null>(null);
let stop: (() => void) | null = null;

function onLoaded(args: { object: Canvas }) {
  if (stop) {
    return;
  }
  stop = runDemo(
    args.object,
    props.demo,
    (instance) => emit('started', instance),
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
      <span class="text-sm font-semibold text-rose-300">This demo couldn't start</span>
      <p class="text-center text-xs text-slate-400">{{ error }}</p>
    </div>
  </div>
</template>
