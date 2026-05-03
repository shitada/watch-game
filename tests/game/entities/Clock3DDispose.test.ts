import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  // Reset shared caches
  (Clock3D as any)._sharedNumbers = { texture: undefined, material: undefined, refCount: 0 };
  (Clock3D as any)._sharedTicks = { majorGeo: undefined, minorGeo: undefined, majorMat: undefined, minorMat: undefined, refCount: 0 };
});

describe('Clock3D disposal', () => {
  it('disposes per-instance geometry and material and removes from parent', () => {
    const c = new Clock3D();

    // hourHand is a per-instance mesh
    const hourHand = (c as any).hourHand as THREE.Mesh;
    expect(hourHand).toBeDefined();

    const geoSpy = vi.spyOn(hourHand.geometry as any, 'dispose');
    const mat = Array.isArray(hourHand.material) ? hourHand.material[0] : hourHand.material;
    const matSpy = vi.spyOn(mat as any, 'dispose');

    const parent = new THREE.Group();
    parent.add(c.group);
    // ensure parent has child
    expect(parent.children.includes(c.group)).toBeTruthy();

    c.dispose();

    expect(geoSpy).toHaveBeenCalled();
    expect(matSpy).toHaveBeenCalled();
    // After dispose, group should have been removed from parent
    expect(parent.children.includes(c.group)).toBeFalsy();
  });
});
