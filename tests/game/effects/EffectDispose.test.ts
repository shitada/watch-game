import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CorrectEffect } from '@/game/effects/CorrectEffect';
import { IncorrectEffect } from '@/game/effects/IncorrectEffect';
import { FireworkEffect } from '@/game/effects/FireworkEffect';

// Mock Canvas 2D context
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  canvas: { width: 300, height: 150 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe('CorrectEffect', () => {
  it('dispose() で geometry と material が解放されること', () => {
    const effect = new CorrectEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene, new THREE.Vector3(0, 0, 0));

    expect(scene.children.length).toBe(1);

    effect.dispose();

    expect(scene.children.length).toBe(0);
  });

  it('dispose() 後に update() を呼んでもエラーにならないこと', () => {
    const effect = new CorrectEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene, new THREE.Vector3(0, 0, 0));
    effect.dispose();

    expect(() => effect.update(0.016)).not.toThrow();
  });

  it('dispose() を2回呼んでもエラーにならないこと（冪等性）', () => {
    const effect = new CorrectEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene, new THREE.Vector3(0, 0, 0));

    expect(() => {
      effect.dispose();
      effect.dispose();
    }).not.toThrow();
  });

  it('trigger() 前に dispose() を呼んでもエラーにならないこと', () => {
    const effect = new CorrectEffect();
    expect(() => effect.dispose()).not.toThrow();
  });
});

describe('IncorrectEffect', () => {
  it('dispose() で geometry と material が解放されること', () => {
    const effect = new IncorrectEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene, new THREE.Vector3(0, 0, 0));

    expect(scene.children.length).toBe(1);

    effect.dispose();

    expect(scene.children.length).toBe(0);
  });

  it('dispose() 後に update() を呼んでもエラーにならないこと', () => {
    const effect = new IncorrectEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene, new THREE.Vector3(0, 0, 0));
    effect.dispose();

    expect(() => effect.update(0.016)).not.toThrow();
  });

  it('dispose() を2回呼んでもエラーにならないこと（冪等性）', () => {
    const effect = new IncorrectEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene, new THREE.Vector3(0, 0, 0));

    expect(() => {
      effect.dispose();
      effect.dispose();
    }).not.toThrow();
  });

  it('trigger() 前に dispose() を呼んでもエラーにならないこと', () => {
    const effect = new IncorrectEffect();
    expect(() => effect.dispose()).not.toThrow();
  });
});

describe('FireworkEffect', () => {
  it('dispose() でロケットがシーンから除去されること', () => {
    const effect = new FireworkEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene);

    expect(scene.children.length).toBeGreaterThan(0);

    effect.dispose();

    expect(scene.children.length).toBe(0);
    expect(effect.isActive()).toBe(false);
  });

  it('dispose() 後に update() を呼んでもエラーにならないこと', () => {
    const effect = new FireworkEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene);
    effect.dispose();

    expect(() => effect.update(0.016)).not.toThrow();
  });

  it('dispose() を2回呼んでもエラーにならないこと（冪等性）', () => {
    const effect = new FireworkEffect();
    const scene = new THREE.Scene();
    effect.trigger(scene);

    expect(() => {
      effect.dispose();
      effect.dispose();
    }).not.toThrow();
  });

  it('trigger() 前に dispose() を呼んでもエラーにならないこと', () => {
    const effect = new FireworkEffect();
    expect(() => effect.dispose()).not.toThrow();
  });
});
