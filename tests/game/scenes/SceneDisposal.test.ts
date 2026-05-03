import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from '@/game/SceneManager';
import type { Scene, SceneContext } from '@/types';

// Mock Canvas context for textures
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  canvas: { width: 300, height: 150 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

class PrevScene implements Scene {
  public disposed = { g: 0, m: 0, t: 0 };
  private scene: THREE.Scene;
  constructor(shouldThrow = false) {
    this.scene = new THREE.Scene();
    const geom = new THREE.BoxGeometry();
    // spy on dispose to track calls
    (vi.spyOn(geom as any, 'dispose') as any).mockImplementation(() => { this.disposed.g++; });

    const tex = new THREE.Texture();
    (vi.spyOn(tex as any, 'dispose') as any).mockImplementation(() => { this.disposed.t++; });

    const mat = new THREE.MeshBasicMaterial({ map: tex });
    (vi.spyOn(mat as any, 'dispose') as any).mockImplementation(() => { this.disposed.m++; });

    const mesh = new THREE.Mesh(geom as any, mat as any);
    this.scene.add(mesh);
    if (shouldThrow) this._throw = true;
  }
  private _throw = false;
  enter(_context: SceneContext): void {}
  update(_dt: number): void {}
  exit(): void {
    if (this._throw) throw new Error('exit boom');
    // noop (simulate missing disposal)
  }
  getThreeScene(): THREE.Scene {
    return this.scene;
  }
  getCamera(): THREE.Camera {
    return new THREE.Camera();
  }
}

class NextScene implements Scene {
  enter(_context: SceneContext): void {}
  update(_dt: number): void {}
  exit(): void {}
  getThreeScene(): THREE.Scene { return new THREE.Scene(); }
  getCamera(): THREE.Camera { return new THREE.Camera(); }
}

describe('SceneManager disposal fallback', () => {
  it('calls disposer when exit() throws', () => {
    const manager = new SceneManager();
    const prev = new PrevScene(true);
    const next = new NextScene();
    manager.register('title', prev);
    manager.register('modeSelect', next);
    // set private currentScene to prev
    (manager as any).currentScene = prev;

    expect(() => manager.transitionTo('modeSelect')).not.toThrow();

    // prev's disposers were mocked to increment counters when called
    expect(prev.disposed.g).toBeGreaterThanOrEqual(1);
    expect(prev.disposed.m).toBeGreaterThanOrEqual(1);
    expect(prev.disposed.t).toBeGreaterThanOrEqual(1);
  });

  it('calls disposer when exit() is noop', () => {
    const manager = new SceneManager();
    const prev = new PrevScene(false);
    const next = new NextScene();
    manager.register('title', prev);
    manager.register('modeSelect', next);
    (manager as any).currentScene = prev;

    expect(() => manager.transitionTo('modeSelect')).not.toThrow();

    expect(prev.disposed.g).toBeGreaterThanOrEqual(1);
    expect(prev.disposed.m).toBeGreaterThanOrEqual(1);
    expect(prev.disposed.t).toBeGreaterThanOrEqual(1);
  });
});
