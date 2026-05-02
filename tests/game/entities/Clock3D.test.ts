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

  // Reset shared numbers cache between tests to ensure isolation
  (Clock3D as any)._sharedNumbers = { texture: undefined, refCount: 0 };
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

  it('getHandTipPosition should reuse provided target instance', () => {
    const clock = new Clock3D();
    const target = new THREE.Vector3(123, 456, 789);
    const ret = clock.getHandTipPosition('hour', target);
    // same instance is returned
    expect(ret).toBe(target);
    // values should be set/updated (y should be positive length)
    expect(target.y).toBeGreaterThan(0);
  });

  it('getHandTipPosition without target should return a new Vector3 each call', () => {
    const clock = new Clock3D();
    const a = clock.getHandTipPosition('hour');
    const b = clock.getHandTipPosition('hour');
    expect(a).not.toBe(b);
    expect(a instanceof THREE.Vector3).toBe(true);
    expect(b instanceof THREE.Vector3).toBe(true);
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

  describe('tick geometry and material sharing', () => {
    it('should share geometry among same type ticks (major/minor)', () => {
      const clock = new Clock3D();
      const majorTicks: THREE.Mesh[] = [];
      const minorTicks: THREE.Mesh[] = [];

      // Ticks are PlaneGeometry meshes added to group
      // Major ticks: 12 (i % 5 === 0), Minor ticks: 48
      clock.group.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) {
          const params = child.geometry.parameters;
          if (params.width === 0.06 && params.height === 0.25) {
            majorTicks.push(child);
          } else if (params.width === 0.02 && params.height === 0.12) {
            minorTicks.push(child);
          }
        }
      });

      expect(majorTicks.length).toBe(12);
      expect(minorTicks.length).toBe(48);

      // All major ticks share the same geometry and material reference
      for (let i = 1; i < majorTicks.length; i++) {
        expect(majorTicks[i].geometry).toBe(majorTicks[0].geometry);
        expect(majorTicks[i].material).toBe(majorTicks[0].material);
      }

      // All minor ticks share the same geometry and material reference
      for (let i = 1; i < minorTicks.length; i++) {
        expect(minorTicks[i].geometry).toBe(minorTicks[0].geometry);
        expect(minorTicks[i].material).toBe(minorTicks[0].material);
      }

      // Major and minor should NOT share the same geometry or material
      expect(majorTicks[0].geometry).not.toBe(minorTicks[0].geometry);
      expect(majorTicks[0].material).not.toBe(minorTicks[0].material);
    });
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

    it('should dispose unique geometries and materials once', () => {
      const clock = new Clock3D();
      const geos = new Set<any>();
      const mats = new Set<any>();

      clock.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) geos.add(child.geometry);
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of materials) if (m) mats.add(m);
        }
      });

      expect(geos.size).toBeGreaterThan(0);
      expect(mats.size).toBeGreaterThan(0);

      const geoSpies = Array.from(geos).map((g) => vi.spyOn(g, 'dispose'));
      const matSpies = Array.from(mats).map((m) => vi.spyOn(m, 'dispose'));

      clock.dispose();

      for (const s of geoSpies) expect(s).toHaveBeenCalled();
      for (const s of matSpies) expect(s).toHaveBeenCalled();

      // calling dispose again should be idempotent and not call dispose again
      const geoCalls = geoSpies.map((s) => s.mock.calls.length);
      const matCalls = matSpies.map((s) => s.mock.calls.length);
      clock.dispose();
      for (let i = 0; i < geoSpies.length; i++) expect(geoSpies[i].mock.calls.length).toBe(geoCalls[i]);
      for (let i = 0; i < matSpies.length; i++) expect(matSpies[i].mock.calls.length).toBe(matCalls[i]);
    });

    it('should dispose unique textures on materials', () => {
      const clock = new Clock3D();
      const texs = new Set<any>();

      const texProps = [
        'map',
        'alphaMap',
        'aoMap',
        'bumpMap',
        'normalMap',
        'displacementMap',
        'emissiveMap',
        'roughnessMap',
        'metalnessMap',
        'envMap',
        'lightMap',
      ];

      clock.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of materials) {
            for (const p of texProps) {
              // @ts-ignore
              const t = (m as any)[p] as THREE.Texture | undefined;
              if (t instanceof THREE.Texture) texs.add(t);
            }
          }
        }
      });

      expect(texs.size).toBeGreaterThan(0);

      const texSpies = Array.from(texs).map((t) => vi.spyOn(t, 'dispose'));

      clock.dispose();

      for (const s of texSpies) expect(s).toHaveBeenCalled();

      // idempotent
      const texCalls = texSpies.map((s) => s.mock.calls.length);
      clock.dispose();
      for (let i = 0; i < texSpies.length; i++) expect(texSpies[i].mock.calls.length).toBe(texCalls[i]);
    });
  });

  describe('shared numbers texture', () => {
    it('should reuse same texture across instances', () => {
      const a = new Clock3D();
      const b = new Clock3D();

      const findNumbersTex = (c: Clock3D) => {
        let tex: THREE.Texture | undefined;
        c.group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === 'numbers') {
            const mat = Array.isArray(child.material) ? child.material[0] as any : child.material as any;
            tex = mat.map as THREE.Texture | undefined;
          }
        });
        return tex;
      };

      const ta = findNumbersTex(a);
      const tb = findNumbersTex(b);
      expect(ta).toBeDefined();
      expect(tb).toBeDefined();
      expect(ta).toBe(tb);
    });

    it('should call shared texture.dispose only once when disposing multiple instances', () => {
      const a = new Clock3D();
      const b = new Clock3D();

      const getShared = (c: Clock3D) => {
        let tex: any;
        c.group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === 'numbers') {
            const mat = Array.isArray(child.material) ? child.material[0] as any : child.material as any;
            tex = mat.map;
          }
        });
        return tex;
      };

      const shared = getShared(a);
      const spy = vi.spyOn(shared, 'dispose');

      a.dispose();
      expect(spy).not.toHaveBeenCalled();

      b.dispose();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
