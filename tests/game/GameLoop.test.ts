import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '@/game/GameLoop';

describe('GameLoop', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should start and call update/render', () => {
    const loop = new GameLoop();
    const onUpdate = vi.fn();
    const onRender = vi.fn();

    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (!rafCallback) rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    loop.start(onUpdate, onRender);

    // Simulate a frame
    if (rafCallback) {
      rafCallback(performance.now() + 16);
    }

    expect(onUpdate).toHaveBeenCalled();
    expect(onRender).toHaveBeenCalled();
    loop.stop();
  });

  it('should cap delta time at 0.1s', () => {
    const loop = new GameLoop();
    const updates: number[] = [];
    const onUpdate = (dt: number) => updates.push(dt);
    const onRender = vi.fn();

    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (!rafCallback) rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    loop.start(onUpdate, onRender);

    // Simulate a frame with 500ms gap
    if (rafCallback) {
      rafCallback(performance.now() + 500);
    }

    expect(updates[0]).toBeLessThanOrEqual(0.1);
    loop.stop();
  });

  it('should pause and stop', () => {
    const loop = new GameLoop();
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

    loop.start(vi.fn(), vi.fn());
    loop.pause();

    expect(cancelSpy).toHaveBeenCalled();
    loop.stop();
  });
});
