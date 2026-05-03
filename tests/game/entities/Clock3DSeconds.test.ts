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
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);

  // Reset shared caches between tests
  (Clock3D as any)._sharedNumbers = { texture: undefined, refCount: 0 };
  (Clock3D as any)._sharedTicks = { majorGeo: undefined, minorGeo: undefined, majorMat: undefined, minorMat: undefined, refCount: 0 };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Clock3D seconds hand update', () => {
  it('applies -(2π/60) radians per second when seconds are shown', () => {
    const clock = new Clock3D();
    clock.setShowSeconds(true);

    const secondHand = (clock as any).secondHand as THREE.Mesh;
    const initial = secondHand.rotation.z;

    clock.update(1);

    const expected = initial - (Math.PI * 2) / 60;
    expect(secondHand.rotation.z).toBeCloseTo(expected, 6);
  });

  it('accumulates properly across multiple frames and does not move when hidden', () => {
    const clock = new Clock3D();
    clock.setShowSeconds(true);

    const secondHand = (clock as any).secondHand as THREE.Mesh;

    // two half-second frames should equal one full second
    clock.update(0.5);
    clock.update(0.5);
    const expectedFull = -(Math.PI * 2) / 60;
    expect(secondHand.rotation.z).toBeCloseTo(expectedFull, 6);

    // Hide seconds: further updates should not affect rotation
    clock.setShowSeconds(false);
    const before = secondHand.rotation.z;
    clock.update(1);
    expect(secondHand.rotation.z).toBeCloseTo(before, 6);
  });
});
