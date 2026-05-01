import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
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

  it('should increment hours when snapMinutes rounds to 60 (step=30, min=45)', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 3, minutes: 45 });
    clock.snapMinutes(30);
    const time = clock.getTime();
    expect(time.hours).toBe(4);
    expect(time.minutes).toBe(0);
  });

  it('should increment hours when snapMinutes rounds to 60 (step=5, min=58)', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 7, minutes: 58 });
    clock.snapMinutes(5);
    const time = clock.getTime();
    expect(time.hours).toBe(8);
    expect(time.minutes).toBe(0);
  });

  it('should wrap hours from 12 to 1 when snapMinutes rounds to 60', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 12, minutes: 50 });
    clock.snapMinutes(30);
    const time = clock.getTime();
    expect(time.hours).toBe(1);
    expect(time.minutes).toBe(0);
  });

  it('should not change hours when snapMinutes does not reach 60 (step=30, min=14)', () => {
    const clock = new Clock3D();
    clock.setTime({ hours: 5, minutes: 14 });
    clock.snapMinutes(30);
    const time = clock.getTime();
    expect(time.hours).toBe(5);
    expect(time.minutes).toBe(0);
  });

  it('should highlight and clear hand', () => {
    const clock = new Clock3D();
    // Should not throw
    clock.highlightHand('minute');
    clock.clearHighlight();
    clock.highlightHand('hour');
    clock.clearHighlight();
  });

  describe('dispose', () => {
    it('should not throw when called', () => {
      const clock = new Clock3D();
      expect(() => clock.dispose()).not.toThrow();
    });

    it('should remove all children from group', () => {
      const clock = new Clock3D();
      expect(clock.group.children.length).toBeGreaterThan(0);
      clock.dispose();
      expect(clock.group.children.length).toBe(0);
    });

    it('should not throw when called twice (idempotent)', () => {
      const clock = new Clock3D();
      clock.dispose();
      expect(() => clock.dispose()).not.toThrow();
    });

    it('should call dispose on geometry and material of meshes', () => {
      const clock = new Clock3D();
      const spies: { geo: ReturnType<typeof vi.spyOn>; mat: ReturnType<typeof vi.spyOn> }[] = [];

      clock.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geoSpy = vi.spyOn(child.geometry, 'dispose');
          const matSpy = vi.spyOn(child.material as THREE.Material, 'dispose');
          spies.push({ geo: geoSpy, mat: matSpy });
        }
      });

      expect(spies.length).toBeGreaterThan(0);
      clock.dispose();

      for (const spy of spies) {
        expect(spy.geo).toHaveBeenCalled();
        expect(spy.mat).toHaveBeenCalled();
      }
    });

    it('should dispose textures on materials with map property', () => {
      const clock = new Clock3D();
      const texSpies: ReturnType<typeof vi.spyOn>[] = [];

      clock.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          if (mat.map) {
            texSpies.push(vi.spyOn(mat.map, 'dispose'));
          }
        }
      });

      expect(texSpies.length).toBeGreaterThan(0);
      clock.dispose();

      for (const spy of texSpies) {
        expect(spy).toHaveBeenCalled();
      }
    });
  });
});
