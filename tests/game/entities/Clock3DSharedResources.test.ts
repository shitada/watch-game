import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  // Reset shared caches between tests
  (Clock3D as any)._sharedNumbers = { texture: undefined, refCount: 0 };
  (Clock3D as any)._sharedTicks = { majorGeo: undefined, minorGeo: undefined, majorMat: undefined, minorMat: undefined, refCount: 0 };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Clock3D shared tick resources', () => {
  it('should share tick geometry and material across instances', () => {
    const a = new Clock3D();
    const b = new Clock3D();

    const findMajorTick = (c: Clock3D) => {
      let found: THREE.Mesh | undefined;
      c.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) {
          const params = (child.geometry as any).parameters;
          if (params.width === 0.06 && params.height === 0.25) {
            found = child;
          }
        }
      });
      return found;
    };

    const ma = findMajorTick(a)!;
    const mb = findMajorTick(b)!;
    expect(ma).toBeDefined();
    expect(mb).toBeDefined();
    // Should be identical references (shared across instances)
    expect(ma.geometry).toBe(mb.geometry);
    expect(ma.material).toBe(mb.material);
  });

  it('should dispose shared tick resources only after last instance disposed', () => {
    const a = new Clock3D();
    const b = new Clock3D();

    // Find shared references
    let sharedGeo: THREE.BufferGeometry | undefined;
    let sharedMat: THREE.Material | undefined;

    a.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) {
        const params = (child.geometry as any).parameters;
        if (params.width === 0.06 && params.height === 0.25) {
          sharedGeo = child.geometry;
          sharedMat = Array.isArray(child.material) ? child.material[0] : child.material;
        }
      }
    });

    expect(sharedGeo).toBeDefined();
    expect(sharedMat).toBeDefined();

    const geoSpy = vi.spyOn(sharedGeo as any, 'dispose');
    const matSpy = vi.spyOn(sharedMat as any, 'dispose');

    a.dispose();
    // Not yet disposed because b still uses them
    expect(geoSpy).not.toHaveBeenCalled();
    expect(matSpy).not.toHaveBeenCalled();

    b.dispose();
    // Now should have been disposed once
    expect(geoSpy).toHaveBeenCalled();
    expect(matSpy).toHaveBeenCalled();
  });
});
