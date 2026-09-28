import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

/**
 * Keeps MasonKit a single module instance during HMR dev sessions.
 *
 * The dev server serves each module over HTTP, and the device caches modules
 * by URL. For NativeScript plugins it currently rewrites `import ... from
 * './framework-registry'` to the extensionless `.../framework-registry` URL
 * but leaves `export ... from` on Vite's resolved `.../framework-registry.js`.
 * MasonKit's entry re-exports what its internals import, so the device loads
 * two copies of modules such as `framework-registry` — the Vue adapter lands
 * in one registry while views read the other, and layout never runs.
 *
 * This rewrites every MasonKit subpath in served `/ns/m` code to the concrete
 * file it resolves to, so both forms share one URL. Dev server only; builds
 * are single bundles and unaffected.
 */
export function masonkitSingleInstance() {
  const require = createRequire(import.meta.url);
  const pkgDir = path.dirname(
    require.resolve('@triniwiz/nativescript-masonkit/package.json'),
  );
  const platform = getPlatform();
  // visionOS builds use MasonKit's iOS sources.
  const platforms = platform === 'visionos' ? ['visionos', 'ios'] : [platform];
  const cache = new Map();

  function canonical(subpath) {
    let resolved = cache.get(subpath);
    if (resolved === undefined) {
      const candidates = [
        subpath,
        ...platforms.map((p) => `${subpath}.${p}.js`),
        `${subpath}.js`,
        ...platforms.map((p) => `${subpath}/index.${p}.js`),
        `${subpath}/index.js`,
      ];
      resolved =
        candidates.find((candidate) => {
          const file = path.join(pkgDir, candidate);
          return fs.existsSync(file) && fs.statSync(file).isFile();
        }) ?? subpath;
      cache.set(subpath, resolved);
    }
    return resolved;
  }

  // `/ns/m/node_modules/@triniwiz/nativescript-masonkit/<subpath>` URLs and
  // bare `@triniwiz/nativescript-masonkit/<subpath>` specifiers.
  const SPECIFIER =
    /((?:\/ns\/m\/node_modules\/|["'])@triniwiz\/nativescript-masonkit\/)([^"'?#\s]+)/g;

  return {
    name: 'masonkit-single-instance',
    apply: 'serve',
    // Register before @nativescript/vite's /ns/m middleware so we wrap it.
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/ns/m/')) {
          return next();
        }
        const end = res.end;
        res.end = function (chunk, ...rest) {
          if (typeof chunk === 'string' && chunk.includes('@triniwiz/nativescript-masonkit/')) {
            chunk = chunk.replace(SPECIFIER, (_m, prefix, subpath) => prefix + canonical(subpath));
            if (!res.headersSent) {
              res.setHeader('Content-Length', Buffer.byteLength(chunk));
            }
          }
          return end.call(this, chunk, ...rest);
        };
        next();
      });
    },
  };
}

function getPlatform() {
  try {
    const env = JSON.parse(process.env.NATIVESCRIPT_BUNDLER_ENV || '{}');
    if (typeof env.platform === 'string') {
      return env.platform.toLowerCase();
    }
    for (const platform of ['android', 'ios', 'visionos', 'windows']) {
      if (env[platform]) {
        return platform;
      }
    }
  } catch {}
  return 'android';
}
