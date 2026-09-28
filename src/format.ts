/**
 * `12345` → `"12,345"`. Used instead of `toLocaleString()`, which currently
 * throws on Windows.
 */
export function formatCount(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
