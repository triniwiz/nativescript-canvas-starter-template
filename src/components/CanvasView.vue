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
  if (!props.height) {
    // @nativescript/canvas 3.0.0-alpha.16 doesn't pass a % size on to a parent that
    // lays out its children itself (NativeScript/canvas#162), so hand it to MasonKit here.
    const parent = args.object.parent as any;
    parent?._setChildPercentSize?.(args.object, true, 1);
    parent?._setChildPercentSize?.(args.object, false, 1);
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
    <Canvas :style="{ width: '100%', height: props.height ?? '100%' }" @loaded="onLoaded" />
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
