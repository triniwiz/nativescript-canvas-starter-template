import fs from 'node:fs';
import path from 'node:path';

/**
 * Fixes for @nativescript/canvas 3.0.0-alpha.16 and PixiJS under @nativescript/vite.
 * They can go once the packages catch up.
 *
 * @returns {import('vite').Plugin[]}
 */
export function nativescriptCanvas() {
  return [canvasPlatformFile(), dynamicImportsToEsm()];
}

/**
 * Dev server only. The HMR deps bundle points a package's own dynamic imports at extensionless
 * URLs (`.../gl/WebGLRenderer`), which the server resolves to the CommonJS `.js` file when an ES
 * `.mjs` sits next to it. PixiJS then loads a second copy of itself and fails at startup
 * ("SharedSystems is not iterable"). This sends those requests to the `.mjs`, which the deps
 * bundle serves. `require()` always asks for `.js` explicitly, so it is unaffected.
 *
 * @returns {import('vite').Plugin}
 */
function dynamicImportsToEsm() {
  const PREFIX = '/ns/m/node_modules/';

  return {
    name: 'nativescript-dynamic-imports-to-esm',
    apply: 'serve',
    // Ahead of @nativescript/vite's /ns/m middleware.
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '';
        if (url.startsWith(PREFIX)) {
          const [pathname, query] = url.split(/(?=\?)/);
          const base = pathname.slice(pathname.lastIndexOf('/') + 1);
          if (!base.includes('.')) {
            const file = path.join(server.config.root, 'node_modules', decodeURIComponent(pathname.slice(PREFIX.length)));
            if (fs.existsSync(`${file}.mjs`) && fs.existsSync(`${file}.js`)) {
              req.url = `${pathname}.mjs${query ?? ''}`;
            }
          }
        }
        next();
      });
    },
  };
}

/**
 * Every `three/addons/...` module id, for `optimizeDeps.exclude`. The HMR server maps a
 * pre-bundled subpath with a dot in it to the wrong URL (`RoomEnvironment//js`,
 * NativeScript/NativeScript#11466), and Vite only excludes exact ids, so each file is listed.
 *
 * @returns {string[]}
 */
export function threeAddons() {
  const dir = new URL('./node_modules/three/examples/jsm/', import.meta.url);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .map((file) => `three/addons/${file.replace(/\\/g, '/')}`);
}

/**
 * Resolves `@nativescript/canvas`'s own `./platform` imports to `platform.js`.
 *
 * The package ships both `platform.js` (capability flags such as `NAPI_HOST`)
 * and a `platform/` directory (per-platform helpers, imported as
 * `./platform/index`). Node and webpack resolve a bare `./platform` to the
 * file, but `@nativescript/vite` (resolveNativeScriptPlatformFile) tries the
 * directory's `index.<platform>.js` first, so the build fails with
 * `"NAPI_HOST" is not exported by platform/index.windows.js`.
 *
 * @returns {import('vite').Plugin}
 */
function canvasPlatformFile() {
  const IN_CANVAS = /[\\/]node_modules[\\/]@nativescript[\\/]canvas[\\/]/;
  const BARE_PLATFORM = /^\.{1,2}(\/\.\.)*\/platform$/;

  return {
    name: 'nativescript-canvas-platform-file',
    enforce: 'pre',
    resolveId: {
      // Ahead of @nativescript/vite's own platform resolver.
      order: 'pre',
      handler(source, importer) {
        if (!importer || !BARE_PLATFORM.test(source)) {
          return null;
        }
        const from = importer.split('?')[0];
        if (!IN_CANVAS.test(from)) {
          return null;
        }
        const file = path.resolve(path.dirname(from), `${source}.js`);
        // Forward slashes, like the rest of the module graph, so Rolldown
        // doesn't see the same file twice under two ids.
        return fs.existsSync(file) ? file.replace(/\\/g, '/') : null;
      },
    },
  };
}
