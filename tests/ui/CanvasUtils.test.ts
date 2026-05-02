import { describe, it, expect, beforeEach } from 'vitest';
import { configureCanvasForTouch } from '@/ui/CanvasUtils';

describe('configureCanvasForTouch', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a fresh canvas element for each test
    canvas = document.createElement('canvas');
  });

  it('applies touch-action styles and sets tabIndex when not present', () => {
    expect(canvas.getAttribute('tabindex')).toBeNull();
    configureCanvasForTouch(canvas);
    // style values are reflected on style property in jsdom
    expect(canvas.style.touchAction).toBe('none');
    expect(canvas.tabIndex).toBe(0);
  });

  it('does not overwrite explicit tabindex when preserveTabIndex is true', () => {
    canvas.setAttribute('tabindex', '5');
    configureCanvasForTouch(canvas, { preserveTabIndex: true });
    expect(canvas.getAttribute('tabindex')).toBe('5');
    // Ensure touch-action still applied
    expect(canvas.style.touchAction).toBe('none');
  });

  it('does not overwrite explicit tabindex when preserveTabIndex is false', () => {
    // If tabindex is explicitly set, we should not overwrite even if preserve=false
    canvas.setAttribute('tabindex', '3');
    configureCanvasForTouch(canvas, { preserveTabIndex: false });
    expect(canvas.getAttribute('tabindex')).toBe('3');
  });

  it('is resilient when called on elements with missing style (best-effort)', () => {
    // Simulate an odd environment by calling with a mocked element that lacks style
    // but keep as any to bypass TS checks
    const odd: any = { getAttribute: () => null, setAttribute: () => {}, tabIndex: -1 };
    // Should not throw
    expect(() => configureCanvasForTouch(odd)).not.toThrow();
  });
});
