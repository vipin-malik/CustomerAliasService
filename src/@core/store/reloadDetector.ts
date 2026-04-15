/**
 * Checks — once, memoized — whether the current document was loaded via a
 * full reload (F5, Ctrl+R, reload button). SPA navigations return false.
 *
 * Called by every persisted store during hydration so they can drop their
 * saved state, and by the `<ReloadNotice/>` dialog to decide whether to open.
 */
let cached: boolean | null = null;

export const isFullReload = (): boolean => {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || !window.performance) {
    cached = false;
    return cached;
  }
  const entries = window.performance.getEntriesByType(
    'navigation',
  ) as PerformanceNavigationTiming[];
  cached = entries[0]?.type === 'reload';
  return cached;
};
