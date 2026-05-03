import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Clock3D } from '@/game/entities/Clock3D';

beforeEach(() => {
  const mockCtx = {
    clearRect: vi.fn(),
    fillText: vi.fn(),
    font: '',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
});

describe('Clock3D numbers material sharing', () => {
  it('shares numbers material between instances and disposes on last dispose', () => {
    const a = new Clock3D();
    const b = new Clock3D();

    const na = a.group.getObjectByName('numbers') as THREE.Mesh | undefined;
    const nb = b.group.getObjectByName('numbers') as THREE.Mesh | undefined;

    expect(na).toBeTruthy();
    expect(nb).toBeTruthy();
    expect(na!.material).toBe(nb!.material);

    const shared = (Clock3D as any)._sharedNumbers as { texture?: THREE.Texture; material?: THREE.Material; refCount: number };
    expect(shared.texture).toBeDefined();
    expect(shared.material).toBeDefined();

    const mat = shared.material as THREE.Material;
    const tex = shared.texture as THREE.Texture;

    const matSpy = vi.spyOn(mat, 'dispose');
    const texSpy = vi.spyOn(tex, 'dispose');

    // dispose first instance: still one left, should not dispose shared resources
    a.dispose();
    expect(matSpy).not.toHaveBeenCalled();
    expect(texSpy).not.toHaveBeenCalled();

    // dispose last instance: should dispose shared material and texture
    b.dispose();
    expect(matSpy).toHaveBeenCalled();
    expect(texSpy).toHaveBeenCalled();

    expect((Clock3D as any)._sharedNumbers.texture).toBeUndefined();
    expect((Clock3D as any)._sharedNumbers.material).toBeUndefined();
  });
});
