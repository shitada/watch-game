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
  (Clock3D as any)._sharedNumbers = { texture: undefined, material: undefined, refCount: 0 };
  (Clock3D as any)._sharedTicks = { majorGeo: undefined, minorGeo: undefined, majorMat: undefined, minorMat: undefined, refCount: 0 };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Clock3D.prewarmSharedResources', () => {
  it('creates shared resources without increasing refCount and instances pick them up', () => {
    // Ensure nothing exists initially
    (Clock3D as any)._sharedNumbers = { texture: undefined, material: undefined, refCount: 0 };
    (Clock3D as any)._sharedTicks = { majorGeo: undefined, minorGeo: undefined, majorMat: undefined, minorMat: undefined, refCount: 0 };

    // Prewarm should create shared resources but leave refCount at 0
    Clock3D.prewarmSharedResources();
    expect((Clock3D as any)._sharedNumbers.texture).toBeDefined();
    expect((Clock3D as any)._sharedNumbers.material).toBeDefined();
    expect((Clock3D as any)._sharedNumbers.refCount).toBe(0);

    expect((Clock3D as any)._sharedTicks.majorGeo).toBeDefined();
    expect((Clock3D as any)._sharedTicks.majorMat).toBeDefined();
    expect((Clock3D as any)._sharedTicks.refCount).toBe(0);

    // Creating an instance should reuse shared resources and increment refCount
    const c = new Clock3D();
    expect((Clock3D as any)._sharedNumbers.refCount).toBe(1);
    expect((Clock3D as any)._sharedTicks.refCount).toBe(1);

    // Dispose the instance should reduce refCount and clean up (since refCount reaches 0)
    const tex = (Clock3D as any)._sharedNumbers.texture as THREE.Texture | undefined;
    const majorGeo = (Clock3D as any)._sharedTicks.majorGeo as THREE.BufferGeometry | undefined;

    const texSpy = tex ? vi.spyOn(tex as any, 'dispose') : null;
    const geoSpy = majorGeo ? vi.spyOn(majorGeo as any, 'dispose') : null;

    c.dispose();

    // After disposing the sole owner, shared resources should be cleared
    expect((Clock3D as any)._sharedNumbers.texture).toBeUndefined();
    expect((Clock3D as any)._sharedTicks.majorGeo).toBeUndefined();

    if (texSpy) expect(texSpy).toHaveBeenCalled();
    if (geoSpy) expect(geoSpy).toHaveBeenCalled();
  });
});
