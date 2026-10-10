# NativeScript Canvas Starter

A NativeScript-Vue starter for Windows, iOS and Android that draws with
[`@nativescript/canvas`](https://github.com/NativeScript/canvas): Canvas 2D,
WebGL, WebGPU and SVG, with three.js and PixiJS on top. Layout uses
[MasonKit](https://github.com/triniwiz/nativescript-mason), and styling uses
Tailwind CSS v4.

## Prerequisites

> NativeScript for Windows is in alpha. Expect rough edges.

To run on Windows you need the following. `npx ns doctor windows` checks them.

| Requirement | Notes |
| --- | --- |
| Windows 10 1809 (build 17763) or later | The app targets `net10.0-windows10.0.26100.0`, with a minimum of `10.0.17763.0`. |
| [Node.js](https://nodejs.org) LTS | Provides `npm` and `npx`. |
| [.NET 10 SDK](https://dotnet.microsoft.com/download) | The build runs `dotnet build`. Check it with `dotnet --version`. |
| Developer Mode | Settings → Privacy & security → For developers. Windows needs it to install and launch the unsigned debug build. |

For iOS and Android, follow the [NativeScript environment setup](https://docs.nativescript.org/setup/).

You don't need to install the NativeScript CLI globally. It's a dev dependency, and the npm scripts run it.

## Getting started

```bash
git clone https://github.com/triniwiz/nativescript-canvas-starter-template my-app
cd my-app
npm install
npm run windows   # or: npm run ios / npm run android
```

`npm run windows` builds the app, installs and launches it, then syncs your
changes into it as you save. `npm run clean` removes the build output.

Use npm. `package.json` relies on npm `overrides`.

## Demos

The home screen links to one page per renderer. Each page has its own folder in
`src/demos/`, holding the page (`*.vue`) and its drawing code (`*.ts`):

| Page | Folder | What it shows |
| --- | --- | --- |
| Canvas 2D | `canvas2d/` | Flow-field particles, an analog clock and a live chart |
| WebGL | `webgl/` | GLSL fragment shaders |
| WebGPU | `webgpu/` | A WGSL compute shader simulating boids |
| three.js | `three/` | PBR materials and an instanced galaxy |
| PixiJS | `pixi/` | Sprites on WebGL or WebGPU |
| SVG | `svg/` | Animated SVG, and SVG generated from Vue state |
| Offscreen & Workers | `offscreen/` | `OffscreenCanvas` sprites, and a canvas drawn by a Worker next to one drawn on the main thread |
| Mix & match | `mix/` | All of the above in one Tailwind grid |
| Layout playground | `playground/` | Flexbox and Grid with MasonKit |

## Project layout

| Path | What it's for |
| --- | --- |
| `src/app.ts` | App entry. Loads the browser polyfills, registers MasonKit's elements, `<Canvas>` and `<Svg>`. |
| `src/demos/<renderer>/` | One folder per demo page (see [Demos](#demos)). The `.ts` files are the drawing code. They don't depend on Vue, so you can copy one into any app. |
| `src/canvas/runner.ts` | Runs a demo on a canvas: sizing, the `requestAnimationFrame` loop and pointer input. |
| `src/canvas/worker-host.ts`, `src/canvas/worker-demo.ts` | Run a demo in a Worker: `runInWorker` hands a canvas over with `transferControlToOffscreen()`, and `serveDemo` draws into it on the Worker's side. |
| `src/components/CanvasView.vue` | `<Canvas>` wrapped for Vue. Anything in its slot is layered over the canvas. |
| `src/components/` | Also the home screen and the pieces the demo pages share. |
| `src/app.css` | Tailwind, plus the `dark:`, `ios:`, `android:`, `windows:`, `phone:` and `tablet:` variants. |
| `postcss-masonkit.mjs` | Keeps the Tailwind layout utilities (`flex`, `grid`, `gap-*`, `max-w-*`, `absolute`, ...) that NativeScript's Tailwind plugin would otherwise remove. |

## Tips

- **Sizing a canvas:** give `<Canvas>` its size with an inline `style`, not
  classes. `CanvasView` does this for you: pass `height` for a fixed height,
  or leave it out and size its box with classes such as `flex-1`. The
  single-canvas demos use `<DemoPage :fill="…">`, so the canvas takes the
  window height left over and the page only scrolls in short windows. As on
  the web, `canvas.width` and `canvas.height` set the backing store; `runDemo`
  sets them for you.
- **Workers:** create one with `new Worker(new URL('./x.worker.ts', import.meta.url))`
  so the bundler builds it, and import `@nativescript/canvas/worker` first in
  its entry file. Where the runtime supports transfers (Windows), the
  OffscreenCanvas moves with `postMessage(…, [offscreen])`; on Android and iOS
  it is sent with `OffscreenCanvas._toHandle()` and received with
  `OffscreenCanvas._fromHandle()`. `runInWorker` picks the right one.
- **Opaque 2D canvases** (`getContext('2d', { alpha: false })`) are faster
  when you paint the whole frame anyway.
- **Typings:** on Windows `getContext()` returns a union, so cast the result,
  for example `canvas.getContext('2d') as CanvasRenderingContext2D`.
- **Elements:** you can write `<div>`, `<section>`, `<h1>`, `<p>`, `<span>`,
  `<button>` and so on. The core NativeScript versions of `<button>`, `<span>`
  and `<label>` are available as `<nbutton>`, `<nspan>` and `<nlabel>`.
- **Responsive layouts:** there are no `sm:` or `md:` breakpoints. Use layouts
  that fit the space they're given, like
  `grid-cols-[repeat(auto-fill,minmax(240,1fr))]` or `flex-wrap` with
  `basis-*`.
- **Units:** unitless values are dp, and `px` means physical pixels.
- **Avoid** `tracking-*`, `leading-*` and `bg-linear-*`. For gradients, write
  a `@utility` instead, like `bg-hero` in `src/app.css`.

## Known issues on Windows

- `Number.prototype.toLocaleString()` throws, so the demos format numbers
  with `formatCount` from `src/format.ts`.

## Troubleshooting

- **Something's missing from your setup:** `npx ns doctor windows` lists what it can't find and how to fix it.
- **The app builds but won't launch** ("deployment failed"): turn on Developer Mode.
- **A stale or broken build:** run `npm run clean`, then `npm run windows` again.

## Temporary workarounds

These can be removed once the fixes are released:

- `@nativescript/core` and `@nativescript/vite` are installed through pkg.pr.new from
  [NativeScript/NativeScript#11468](https://github.com/NativeScript/NativeScript/pull/11468),
  which is the `feat/windows` branch plus percentage sizes inside MasonKit layouts.
- `overrides` pins the `@nativescript/canvas*` packages to `3.0.0-alpha.16`
  (`canvas-svg` to `3.0.0-alpha.15`, its latest). They depend on each other
  with `"*"`, which doesn't match prereleases.
- `@nativescript/windows` is pinned to an exact alpha, because a caret range
  would also match older, incompatible betas.
- `canvas-workarounds.mjs` makes the canvas package's `./platform` import
  resolve to `platform.js` rather than the `platform/` folder
  ([#11464](https://github.com/NativeScript/NativeScript/pull/11464)).
  Its `threeAddons()` keeps three.js addons out of Vite's pre-bundling,
  because HMR requests them at the wrong URL
  ([#11466](https://github.com/NativeScript/NativeScript/pull/11466)). During
  HMR it also points PixiJS's dynamic imports at its ES modules instead of its
  CommonJS files, which would load a second copy of PixiJS.
- `CanvasView` hands its canvas's `100%` size to MasonKit itself, because
  canvas doesn't pass percentage sizes on yet
  ([canvas#162](https://github.com/NativeScript/canvas/pull/162)).
- `masonkit-hmr.mjs` stops MasonKit from loading twice during HMR.
- `postcss-selector-commas.mjs` makes classes with a comma, like
  `grid-cols-[repeat(auto-fill,minmax(240,1fr))]`, match
  ([#11463](https://github.com/NativeScript/NativeScript/pull/11463)).
