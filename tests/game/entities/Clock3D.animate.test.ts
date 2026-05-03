import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Clock3D } from '@/game/entities/Clock3D';
import type { ClockTime } from '@/types';

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
  // Reset shared numbers cache
  (Clock3D as any)._sharedNumbers = { texture: undefined, refCount: 0, material: undefined };
});

describe('Clock3D.animateTo', () => {
  it('sets final time when animateTo is called', async () => {
    const clock = new Clock3D();
    const target: ClockTime = { hours: 4, minutes: 30 };
    await clock.animateTo(target, 100);
    const t = clock.getTime();
    expect(t.hours).toBe(4);
    expect(t.minutes).toBe(30);
  });
});
