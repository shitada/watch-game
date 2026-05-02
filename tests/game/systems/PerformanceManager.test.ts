import { describe, it, expect, vi } from 'vitest';
import { PerformanceManager } from '@/game/systems/PerformanceManager';

describe('PerformanceManager', () => {
  it('applies initial pixel ratio and size on applyInitial', () => {
    const fakeRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
    const mgr = new PerformanceManager(fakeRenderer, {
      qualityLevels: [0.5, 1, 2],
      sampleSize: 3,
      thresholds: { highMs: 30, lowMs: 10 },
      cooldownMs: 100,
      initialIndex: 1,
    });

    mgr.applyInitial();

    expect(fakeRenderer.setPixelRatio).toHaveBeenCalledWith(1);
    expect(fakeRenderer.setSize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
  });

  it('downgrades quality when frame times are high', () => {
    const fakeRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
    const mgr = new PerformanceManager(fakeRenderer, {
      qualityLevels: [0.5, 1, 2],
      sampleSize: 3,
      thresholds: { highMs: 30, lowMs: 10 },
      cooldownMs: 10,
      initialIndex: 1,
    });

    mgr.applyInitial();
    // simulate slow frames
    mgr.recordFrame(40);
    mgr.recordFrame(45);
    mgr.recordFrame(50);

    // last setPixelRatio should be downgraded to 0.5
    expect(fakeRenderer.setPixelRatio).toHaveBeenLastCalledWith(0.5);
    expect(mgr.getCurrentQualityIndex()).toBe(0);
  });

  it('upgrades quality when frame times are low', () => {
    const fakeRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
    const mgr = new PerformanceManager(fakeRenderer, {
      qualityLevels: [0.5, 1, 2],
      sampleSize: 3,
      thresholds: { highMs: 30, lowMs: 10 },
      cooldownMs: 10,
      initialIndex: 1,
    });

    mgr.applyInitial();
    // simulate fast frames
    mgr.recordFrame(8);
    mgr.recordFrame(9);
    mgr.recordFrame(7);

    expect(fakeRenderer.setPixelRatio).toHaveBeenLastCalledWith(2);
    expect(mgr.getCurrentQualityIndex()).toBe(2);
  });
});
