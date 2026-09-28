<script lang="ts" setup generic="T extends DemoInstance">
import { onUnmounted, ref } from 'nativescript-vue';
import type { Canvas } from '@nativescript/canvas';
import { runDemo, type Demo, type DemoInstance } from '../canvas/runner';

/**
 * A <Canvas> that runs a demo from src/canvas/demos, filling the width it is
 * given at `height` dp. The default slot is layered on top of the canvas, so
 * MasonKit content (badges, captions, controls) can sit over the drawing.
 *
 * The height is a prop rather than a class for two reasons: the canvas sets
 * its own width/height as local style values, which outrank class rules, and
 * on Windows MasonKit sizes a core view like the canvas from its native size,
 * so a percentage height there comes out as 0.
 */
const props = defineProps<{ demo: Demo<T>; height: number }>();
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
  <div class="relative overflow-hidden" :style="{ height: props.height }">
    <Canvas :style="{ width: '100%', height: props.height }" @loaded="onLoaded" />
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
