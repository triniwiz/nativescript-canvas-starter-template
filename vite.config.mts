import { defineConfig, mergeConfig } from 'vite';
import { vueConfig } from '@nativescript/vite/vue';
import { protect, restore } from './postcss-masonkit.mjs';
import { masonkitSingleInstance } from './masonkit-hmr.mjs';
import { nativescriptCanvas, threeAddons } from './canvas-workarounds.mjs';
import { escapedSelectorCommas } from './postcss-selector-commas.mjs';

export default defineConfig(({ mode }) =>
  mergeConfig(vueConfig({ mode }), {
    plugins: [masonkitSingleInstance(), ...nativescriptCanvas()],
    optimizeDeps: {
      // MasonKit must load as a single instance over the HMR server. If Vite
      // pre-bundles a subpath (e.g. `/vue`), that copy is routed to the vendor
      // bundle, where MasonKit is deliberately absent, and its exports come
      // back undefined ("installMasonKit is not a function").
      exclude: [
        '@triniwiz/nativescript-masonkit',
        '@triniwiz/nativescript-masonkit/vue',
        '@triniwiz/nativescript-masonkit/web',
        '@triniwiz/nativescript-masonkit/elements',
        // Served as is: see threeAddons in canvas-workarounds.mjs.
        ...threeAddons(),
      ],
    },
    css: {
      postcss: {
        // Lets Tailwind layout utilities (flex, grid, gap, max-w, ...) reach
        // MasonKit views instead of being stripped for core layouts, and keeps
        // classes with commas in them, like `grid-cols-[repeat(...,...)]`.
        plugins: [protect(), restore(), escapedSelectorCommas()],
      },
    },
  }),
);
