import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Clock3D } from '@/game/entities/Clock3D';

// Mock canvas 2D context for jsdom
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

describe('Clock3D', () => {
  it('should initialize at 12:00', () => {
    const clock = new Clock3D();
    const time = clock.getTime();
    expect(time.hours).toBe(12);
    expect(time.minutes).toBe(0);
  });

  it('should set and get time correctly', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 3, minutes: 30 });
    const time = clock.getTime();
    expect(time.hours).toBe(3);
    expect(time.minutes).toBe(30);
  });

  it('should snap minutes to step', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 5, minutes: 13 });
    clock.snapMinutes(5);
    const time = clock.getTime();
    expect(time.minutes).toBe(15);
  });

  it('should snap minutes to 30-min step', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 5, minutes: 20 });
    clock.snapMinutes(30);
    const time = clock.getTime();
    expect(time.minutes).toBe(30);
  });

  it('should convert angles to minutes (12 oclock = 0 min)', () => {
    const clock = new Clock3D();
    // 12 o'clock: angle = PI/2 (pointing up)
    const minutes = clock.angleToMinutes(Math.PI / 2);
    expect(minutes).toBe(0);
  });

  it('should convert angles to minutes (3 oclock = 15 min)', () => {
    const clock = new Clock3D();
    // 3 o'clock: angle = 0 (pointing right)
    const minutes = clock.angleToMinutes(0);
    expect(minutes).toBe(15);
  });

  it('should convert angles to minutes (6 oclock = 30 min)', () => {
    const clock = new Clock3D();
    // 6 o'clock: angle = -PI/2 (pointing down)
    const minutes = clock.angleToMinutes(-Math.PI / 2);
    expect(minutes).toBe(30);
  });

  it('should have a clock face mesh', () => {
    const clock = new Clock3D();
    const face = clock.getClockFaceMesh();
    expect(face).toBeDefined();
  });
});
