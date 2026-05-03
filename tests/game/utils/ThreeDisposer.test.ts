import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { safeDisposeScene } from '@/game/utils/ThreeDisposer';

// Mock Canvas 2D context used by some materials/textures
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  canvas: { width: 300, height: 150 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe('ThreeDisposer', () => {
  it('calls dispose on geometry, material and texture', () => {
    const scene = new THREE.Scene();

    const geom = new THREE.BoxGeometry();
    geom.dispose = vi.fn();

    const tex = new THREE.Texture();
    tex.dispose = vi.fn();

    const mat = new THREE.MeshBasicMaterial({ map: tex });
    mat.dispose = vi.fn();

    const mesh = new THREE.Mesh(geom, mat);
    scene.add(mesh);

    const res = safeDisposeScene(scene);

    expect(res.disposedGeometries).toBe(1);
    expect(res.disposedMaterials).toBe(1);
    expect(res.disposedTextures).toBe(1);

    expect((geom.dispose as any)).toHaveBeenCalled();
    expect((mat.dispose as any)).toHaveBeenCalled();
    expect((tex.dispose as any)).toHaveBeenCalled();
  });
});
