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
    const origDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    try {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
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
    } finally {
      if (origDesc) Object.defineProperty(window, 'devicePixelRatio', origDesc);
      else delete (window as any).devicePixelRatio;
    }
  });

  it('clamps pixel ratio to window.devicePixelRatio when device DPR is smaller', () => {
    const origDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    try {
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
      const fakeRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
      const mgr = new PerformanceManager(fakeRenderer, {
        qualityLevels: [1, 2],
        initialIndex: 1,
      });

      mgr.applyInitial();

      expect(fakeRenderer.setPixelRatio).toHaveBeenCalledWith(1);
    } finally {
      if (origDesc) Object.defineProperty(window, 'devicePixelRatio', origDesc);
      else delete (window as any).devicePixelRatio;
    }
  });

  it('uses requested pixel ratio when device DPR is larger', () => {
    const origDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    try {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      const fakeRenderer = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
      const mgr = new PerformanceManager(fakeRenderer, {
        qualityLevels: [1, 1.5, 2],
        initialIndex: 1,
      });

      mgr.applyInitial();

      // requested was 1.5 and device DPR is 2 -> should use 1.5
      expect(fakeRenderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    } finally {
      if (origDesc) Object.defineProperty(window, 'devicePixelRatio', origDesc);
      else delete (window as any).devicePixelRatio;
    }
  });

  it('falls back to requested when device DPR is NaN or undefined', () => {
    const origDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    try {
      Object.defineProperty(window, 'devicePixelRatio', { value: NaN, configurable: true });
      const fakeRenderer1 = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
      const mgr1 = new PerformanceManager(fakeRenderer1, {
        qualityLevels: [1, 2],
        initialIndex: 1,
      });
      mgr1.applyInitial();
      expect(fakeRenderer1.setPixelRatio).toHaveBeenCalledWith(2);

      // undefined
      Object.defineProperty(window, 'devicePixelRatio', { value: undefined, configurable: true });
      const fakeRenderer2 = { setPixelRatio: vi.fn(), setSize: vi.fn() } as any;
      const mgr2 = new PerformanceManager(fakeRenderer2, {
        qualityLevels: [1, 2],
        initialIndex: 1,
      });
      mgr2.applyInitial();
      expect(fakeRenderer2.setPixelRatio).toHaveBeenCalledWith(2);
    } finally {
      if (origDesc) Object.defineProperty(window, 'devicePixelRatio', origDesc);
      else delete (window as any).devicePixelRatio;
    }
  });
});
