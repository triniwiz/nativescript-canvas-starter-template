import fs from 'node:fs';
import path from 'node:path';

/**
 * Dev server only. The HMR deps bundle points a package's own dynamic imports at extensionless
 * URLs (`.../gl/WebGLRenderer`), which the server resolves to the CommonJS `.js` file when an ES
 * `.mjs` sits next to it. PixiJS then loads a second copy of itself and fails at startup
 * ("SharedSystems is not iterable"). This sends those requests to the `.mjs`, which the deps
 * bundle serves. `require()` always asks for `.js` explicitly, so it is unaffected.
 *
 * @returns {import('vite').Plugin}
 */
export function dynamicImportsToEsm() {
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
