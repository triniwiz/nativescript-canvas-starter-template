/**
 * Keeps Tailwind classes with a comma in them working, such as
 * `grid-cols-[repeat(auto-fill,minmax(240,1fr))]`.
 *
 * `@nativescript/vite` splits a rule's selector list at every comma, escaped
 * or not, so `.grid-cols-\[repeat\(auto-fill\,minmax...` becomes two
 * selectors that match nothing. Writing the comma as the hex escape `\00002c`
 * leaves nothing to split on, and core's selector parser still reads it as a
 * comma. Remove this once `@nativescript/vite` ships the fix
 * (NativeScript/NativeScript#11463).
 */

// A `\,` that isn't preceded by an escaped backslash.
const ESCAPED_COMMA = /(?<!\\)((?:\\\\)*)\\,/g;

/** @returns {import('postcss').Plugin} */
export function escapedSelectorCommas() {
  return {
    postcssPlugin: 'escaped-selector-commas',
    OnceExit(root) {
      root.walkRules((rule) => {
        if (rule.selector.includes('\\,')) {
          rule.selector = rule.selector.replace(ESCAPED_COMMA, '$1\\00002c');
        }
      });
    },
  };
}
escapedSelectorCommas.postcss = true;
