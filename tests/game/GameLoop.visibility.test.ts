import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '@/game/GameLoop';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('GameLoop visibility handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // default to visible
    setVisibility('visible');
  });

  it('starts RAF when visible', () => {
    const loop = new GameLoop();
    const onUpdate = vi.fn();
    const onRender = vi.fn();

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      // call later
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    loop.start(onUpdate, onRender);

    expect(rafSpy).toHaveBeenCalled();

    loop.stop();
  });

  it('pauses (cancelAnimationFrame) when visibility becomes hidden', () => {
    const loop = new GameLoop();
    const onUpdate = vi.fn();
    const onRender = vi.fn();

    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb as any;
      return 1;
    });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    loop.start(onUpdate, onRender);

    // simulate visibility hidden
    setVisibility('hidden');

    expect(cancelSpy).toHaveBeenCalled();

    loop.stop();
  });

  it('resumes (requestAnimationFrame) when visibility returns to visible', () => {
    const loop = new GameLoop();
    const onUpdate = vi.fn();
    const onRender = vi.fn();

    let rafCallCount = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallCount += 1;
      return rafCallCount;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // start visible
    loop.start(onUpdate, onRender);
    expect(rafCallCount).toBeGreaterThanOrEqual(1);

    // go hidden
    setVisibility('hidden');

    const before = rafCallCount;

    // back to visible
    setVisibility('visible');

    expect(rafCallCount).toBeGreaterThan(before);

    loop.stop();
  });
});
