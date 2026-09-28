/**
 * Keeps Tailwind's layout utilities working with MasonKit.
 *
 * `@nativescript/tailwind` drops every declaration core NativeScript layouts
 * can't use (`display`, `gap`, `grid-template-columns`, `max-width`,
 * `position`, ...). MasonKit implements those properties, so we hide them
 * behind a custom-property prefix before that filter runs (custom properties
 * are always kept) and restore them once every plugin is done.
 *
 * `protect` must come before `@nativescript/tailwind` in the plugin list;
 * `restore` only runs in `OnceExit`, so its position doesn't matter.
 */

const PREFIX = '--masonkit-keep-';

// CSS properties MasonKit understands that `@nativescript/tailwind` removes.
const MASON_PROPERTIES = new Set([
  'aspect-ratio',
  'backdrop-filter',
  'background-attachment',
  'background-blend-mode',
  'background-clip',
  'background-origin',
  'background-position-x',
  'background-position-y',
  'border',
  'border-bottom',
  'border-left',
  'border-right',
  'border-top',
  'border-style',
  'bottom',
  'box-sizing',
  'clear',
  'column-gap',
  'display',
  'filter',
  'flex-basis',
  'flex-flow',
  'float',
  'gap',
  'grid-area',
  'grid-auto-columns',
  'grid-auto-flow',
  'grid-auto-rows',
  'grid-column',
  'grid-column-end',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-start',
  'grid-template-areas',
  'grid-template-columns',
  'grid-template-rows',
  'inset',
  'left',
  'list-style-position',
  'list-style-type',
  'max-height',
  'max-width',
  'object-fit',
  'object-position',
  'overflow',
  'overflow-x',
  'overflow-y',
  'position',
  'right',
  'row-gap',
  'text-overflow',
  'top',
  'white-space',
  'word-spacing',
]);

/** @returns {import('postcss').Plugin} */
export function protect() {
  return {
    postcssPlugin: 'masonkit-protect',
    Declaration(decl) {
      // Tailwind preflight's `[hidden] { display: none }` must stay stripped:
      // core defines `hidden` (default false) on every view, and `[hidden]`
      // matches any non-null value, so it would hide the entire Mason tree.
      if (decl.parent?.selector?.includes('[hidden]')) {
        return;
      }
      if (MASON_PROPERTIES.has(decl.prop)) {
        decl.prop = PREFIX + decl.prop;
      }
    },
  };
}
protect.postcss = true;

/** @returns {import('postcss').Plugin} */
export function restore() {
  return {
    postcssPlugin: 'masonkit-restore',
    OnceExit(root) {
      root.walkDecls((decl) => {
        if (decl.prop.startsWith(PREFIX)) {
          decl.prop = decl.prop.slice(PREFIX.length);
        }
      });
    },
  };
}
restore.postcss = true;
