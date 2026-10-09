<script lang="ts" setup>
import { computed, ref, shallowRef, watch } from 'nativescript-vue';
import { formatCount } from '../../format';
import DemoPage from '../../components/DemoPage.vue';
import CanvasView from '../../components/CanvasView.vue';
import Segmented from '../../components/Segmented.vue';
import { boids, type BoidPreset, type Boids, type GPUInfo } from './boids';

const presets: { label: string; value: BoidPreset }[] = [
  { label: 'Flock', value: 'flock' },
  { label: 'Swarm', value: 'swarm' },
  { label: 'Drift', value: 'drift' },
];
const preset = ref<BoidPreset>('flock');

// The particle buffers are sized up front, so a new count mounts a new canvas.
const counts = [
  { label: '1K', value: 1024 },
  { label: '2K', value: 2048 },
  { label: '4K', value: 4096 },
];
const count = ref(__ANDROID__ ? 1024 : 2048);

const flock = shallowRef<Boids>();
watch(preset, (value) => flock.value?.setPreset(value));

const info = ref<GPUInfo>();
const details = computed(() =>
  info.value
    ? [
        { label: 'Vendor', value: info.value.vendor },
        { label: 'Architecture', value: info.value.architecture },
        { label: 'Adapter', value: info.value.description || '—' },
        { label: 'Canvas format', value: info.value.format },
      ]
    : [],
);

const demo = computed(() =>
  boids({ count: count.value, onInfo: (value) => (info.value = value) }),
);

function onStarted(instance: Boids) {
  flock.value = instance;
  instance.setPreset(preset.value);
}
</script>

<template>
  <DemoPage
    :fill="760"
    eyebrow="WebGPU"
    title="Compute boids"
    description="Every frame a WGSL compute shader steers each boid from its neighbours, then an instanced render pass draws the flock. Touch the canvas to attract them."
  >
    <section class="card flex flex-1 flex-col gap-4">
      <CanvasView
        :key="count"
        :demo="demo"
        class="min-h-[240] w-full flex-1 rounded-2xl"
        @started="onStarted"
      >
        <div class="absolute left-3 top-3 flex flex-row gap-2">
          <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {{ formatCount(count) }} boids
          </span>
          <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            O(n²) per frame on the GPU
          </span>
        </div>
      </CanvasView>
      <div class="flex flex-row flex-wrap items-center justify-between gap-3">
        <Segmented v-model="preset" :options="presets" />
        <div class="flex flex-row flex-wrap items-center gap-2">
          <Segmented v-model="count" :options="counts" />
          <button
            class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white active:bg-indigo-600"
            @tap="flock?.reset()"
          >
            Scatter
          </button>
        </div>
      </div>
    </section>

    <section class="card flex flex-col gap-4">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Adapter</h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(200,1fr))] gap-3">
        <div
          v-for="item in details"
          :key="item.label"
          class="flex flex-col gap-1 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"
        >
          <span class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            {{ item.label }}
          </span>
          <span class="text-sm font-medium text-slate-900 dark:text-white">{{ item.value }}</span>
        </div>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Powered by wgpu, which picks the native graphics API: Metal on iOS, Vulkan on Android (API 27+), Direct3D or Vulkan on Windows.
      </p>
    </section>
  </DemoPage>
</template>
