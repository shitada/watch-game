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

  it('should set hour angle to 3 oclock', () => {
    const clock = new Clock3D();
    // 3 o'clock: angle = 0 (pointing right)
    clock.setHourAngle(0);
    expect(clock.getTime().hours).toBe(3);
  });

  it('should set hour angle to 12 oclock', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 5, minutes: 15 });
    // 12 o'clock: angle = PI/2 (pointing up)
    clock.setHourAngle(Math.PI / 2);
    expect(clock.getTime().hours).toBe(12);
    // Minutes should be preserved
    expect(clock.getTime().minutes).toBe(15);
  });

  it('should set hour angle to 6 oclock', () => {
    const clock = new Clock3D();
    // 6 o'clock: angle = -PI/2 (pointing down)
    clock.setHourAngle(-Math.PI / 2);
    expect(clock.getTime().hours).toBe(6);
  });

  it('should return hand tip positions', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 12, minutes: 0 });
    const hourTip = clock.getHandTipPosition('hour');
    const minuteTip = clock.getHandTipPosition('minute');
    // Both hands point up (12 o'clock), minute hand is longer
    expect(minuteTip.y).toBeGreaterThan(hourTip.y);
  });

  it('should highlight and clear hand', () => {
    const clock = new Clock3D();
    // Should not throw
    clock.highlightHand('minute');
    clock.clearHighlight();
    clock.highlightHand('hour');
    clock.clearHighlight();
  });
});
