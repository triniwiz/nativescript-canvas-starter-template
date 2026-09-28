<script lang="ts" setup>
import { computed, ref, shallowRef, watch } from 'nativescript-vue';
import DemoPage from '../DemoPage.vue';
import CanvasView from '../CanvasView.vue';
import Segmented from '../Segmented.vue';
import {
  shaderGallery,
  type GLInfo,
  type ShaderGallery,
  type ShaderName,
} from '../../canvas/demos/shader-gallery';

const options: { label: string; value: ShaderName }[] = [
  { label: 'Plasma', value: 'plasma' },
  { label: 'Aurora', value: 'aurora' },
  { label: 'Metaballs', value: 'metaballs' },
  { label: 'Tunnel', value: 'tunnel' },
];
const shader = ref<ShaderName>('plasma');
const gallery = shallowRef<ShaderGallery>();
watch(shader, (name) => gallery.value?.setShader(name));

const info = ref<GLInfo>();
const details = computed(() =>
  info.value
    ? [
        { label: 'Version', value: info.value.version },
        { label: 'Renderer', value: info.value.renderer },
        { label: 'Vendor', value: info.value.vendor },
        { label: 'GLSL', value: info.value.shadingLanguage },
        { label: 'Max texture', value: `${info.value.maxTextureSize}px` },
      ]
    : [],
);

const demo = shaderGallery({ shader: shader.value, onInfo: (value) => (info.value = value) });
</script>

<template>
  <DemoPage
    :fill="760"
    eyebrow="WebGL"
    title="Fragment shaders"
    description="Raw WebGL 1: one full-screen triangle, a GLSL fragment shader, and time, resolution and pointer uniforms. Drag across the canvas to move the effect."
  >
    <section class="card flex flex-1 flex-col gap-4">
      <CanvasView :demo="demo" class="min-h-[240] w-full flex-1 rounded-2xl" @started="gallery = $event">
        <div class="absolute bottom-3 left-3 flex flex-row gap-2">
          <span class="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
            getContext('webgl')
          </span>
          <span class="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
            {{ shader }}.frag
          </span>
        </div>
      </CanvasView>
      <Segmented v-model="shader" :options="options" />
    </section>

    <section class="card flex flex-col gap-4">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-white">This context</h2>
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
    </section>
  </DemoPage>
</template>
