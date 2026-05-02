export type RendererLike = {
  setPixelRatio: (n: number) => void;
  setSize: (w: number, h: number) => void;
};

export interface PerformanceManagerOptions {
  qualityLevels?: number[];
  sampleSize?: number;
  thresholds?: { highMs: number; lowMs: number };
  cooldownMs?: number;
  initialIndex?: number;
}

export class PerformanceManager {
  private renderer: RendererLike;
  private qualityLevels: number[];
  private index: number;
  private sampleSize: number;
  private thresholds: { highMs: number; lowMs: number };
  private cooldownMs: number;
  private lastChangeAt = 0;
  private frameTimes: number[] = [];

  constructor(renderer: RendererLike, opts: PerformanceManagerOptions = {}) {
    this.renderer = renderer;
    this.qualityLevels = opts.qualityLevels ?? [1, 1.5, 2];
    this.sampleSize = opts.sampleSize ?? 30;
    this.thresholds = opts.thresholds ?? { highMs: 40, lowMs: 18 };
    this.cooldownMs = opts.cooldownMs ?? 2000;
    const defaultIndex = Math.floor(this.qualityLevels.length / 2);
    this.index = opts.initialIndex ?? defaultIndex;
  }

  applyInitial() {
    // Ensure renderer starts with configured pixel ratio and size
    const pr = this.getEffectivePixelRatio(this.qualityLevels[this.index]);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Allow immediate adaptation after applying initial settings by offsetting lastChangeAt
    this.lastChangeAt = Date.now() - this.cooldownMs;
  }

  onResize(w: number, h: number) {
    // On resize we only need to update size. Pixel ratio stays managed by manager.
    this.renderer.setSize(w, h);
  }

  recordFrame(dtMs: number) {
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > this.sampleSize) this.frameTimes.shift();

    if (this.frameTimes.length < Math.max(1, Math.floor(this.sampleSize / 2))) return;

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const now = Date.now();
    if (now - this.lastChangeAt < this.cooldownMs) return; // cooldown

    if (avg > this.thresholds.highMs && this.index > 0) {
      this.index = this.index - 1;
      this.apply();
      this.lastChangeAt = now;
    } else if (avg < this.thresholds.lowMs && this.index < this.qualityLevels.length - 1) {
      this.index = this.index + 1;
      this.apply();
      this.lastChangeAt = now;
    }
  }

  private apply() {
    const pr = this.getEffectivePixelRatio(this.qualityLevels[this.index]);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Helpers for tests / debugging
  getCurrentQualityIndex() {
    return this.index;
  }

  setQualityIndex(i: number) {
    if (i < 0 || i >= this.qualityLevels.length) return;
    this.index = i;
    this.apply();
    this.lastChangeAt = Date.now();
  }

  // Determine an effective pixel ratio by clamping the requested value to the
  // device's window.devicePixelRatio when that value is a finite number.
  // If devicePixelRatio is undefined or not a finite number (NaN/Infinity),
  // the requested value is returned unchanged.
  private getEffectivePixelRatio(requested: number): number {
    try {
      // Use typeof check and Number.isFinite per reviewer guidance
      const dpr = (typeof window !== 'undefined' && 'devicePixelRatio' in window)
        ? (window as any).devicePixelRatio
        : undefined;
      if (typeof dpr === 'number' && Number.isFinite(dpr)) {
        return Math.min(requested, dpr);
      }
    } catch (e) {
      // If accessing window fails for any reason, fall back to requested
    }
    return requested;
  }
}

