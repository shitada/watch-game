/**
 * Utilities for configuring canvas element for better touch behavior on mobile devices.
 * Best-effort: does not throw.
 */
export function configureCanvasForTouch(
  canvas: HTMLCanvasElement,
  options?: { preserveTabIndex?: boolean }
): void {
  try {
    // Apply touch-action and related properties to prevent gestures from interfering
    // with the canvas (e.g. pinch-zoom, double-tap) on mobile browsers.
    canvas.style.touchAction = 'none';
    // vendor prefixes for broader compatibility
    // @ts-ignore - these style props may not exist on CSSStyleDeclaration in some envs
    canvas.style.webkitTouchCallout = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.userSelect = 'none';

    // Manage tabIndex for accessibility. Do not overwrite if explicitly set.
    const preserve = options?.preserveTabIndex ?? false;
    const hasExplicitTabIndex = canvas.getAttribute('tabindex') !== null;
    if (!preserve && !hasExplicitTabIndex) {
      // Make canvas focusable so keyboard users / assistive tech can interact if needed.
      // Setting to 0 follows common accessibility practice.
      canvas.tabIndex = 0;
    }
  } catch (e) {
    // Best-effort: swallow any errors to avoid breaking app initialization.
    // eslint-disable-next-line no-console
    console.warn('configureCanvasForTouch failed', e);
  }
}
