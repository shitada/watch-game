import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { HintEffect } from '@/game/effects/HintEffect';

describe('HintEffect', () => {
  let scene: THREE.Scene;
  let effect: HintEffect;
  beforeEach(() => {
    scene = new THREE.Scene();
    effect = new HintEffect();
  });

  it('trigger() でシーンにエフェクトが追加され、2秒後に自動で削除される', () => {
    vi.useFakeTimers();
    const time = { hours: 3, minutes: 15 };
    effect.trigger(scene, time, new THREE.Vector3(0, 0.8, 0));
    // should have points
    expect(scene.children.length).toBeGreaterThan(0);

    // simulate updates over time
    let elapsed = 0;
    while (elapsed < 2100) {
      effect.update(0.1);
      elapsed += 100;
      vi.advanceTimersByTime(100);
    }

    // Allow cleanup to run
    effect.update(0.1);
    expect(scene.children.length).toBe(0);
    vi.useRealTimers();
  });
});
