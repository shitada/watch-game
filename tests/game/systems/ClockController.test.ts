import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ClockController } from '@/game/systems/ClockController';
import { Clock3D } from '@/game/entities/Clock3D';

// ── Mock setup ──

// Mock canvas 2D context for jsdom (Clock3D texture generation)
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

  // [W-2] Stub setPointerCapture / releasePointerCapture
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

/** Create a minimal mock renderer with a real DOM canvas */
function createMockRenderer(): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  // [S-2] Provide valid getBoundingClientRect
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { domElement: canvas } as unknown as THREE.WebGLRenderer;
}

/** Helper: create a PointerEvent with clientX/clientY */
function pointerEvent(
  type: string,
  clientX = 400,
  clientY = 300,
  pointerId = 1,
): PointerEvent {
  return new PointerEvent(type, {
    clientX,
    clientY,
    pointerId,
    bubbles: true,
  });
}

/**
 * Setup raycaster mocks so that:
 * - hitTestClock returns true (intersectObject returns a hit)
 * - getWorldPoint returns a controllable point
 * - getAngleFromPointer returns atan2 of that point relative to clock center
 */
function setupRaycasterForDrag(worldPoint: THREE.Vector3): void {
  // [W-1] Mock setFromCamera
  vi.spyOn(THREE.Raycaster.prototype, 'setFromCamera').mockImplementation(
    () => {},
  );
  // [W-3] intersectObject returns a hit
  vi.spyOn(
    THREE.Raycaster.prototype,
    'intersectObject',
  ).mockReturnValue([{ distance: 1 } as THREE.Intersection]);

  // [W-1] ray.intersectPlane writes the worldPoint into the target
  vi.spyOn(THREE.Ray.prototype, 'intersectPlane').mockImplementation(
    function (_plane: THREE.Plane, target: THREE.Vector3) {
      target.copy(worldPoint);
      return target;
    },
  );
}

describe('ClockController', () => {
  let clock: Clock3D;
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.Camera;
  let controller: ClockController;

  beforeEach(() => {
    vi.restoreAllMocks();
    clock = new Clock3D();
    renderer = createMockRenderer();
    camera = new THREE.PerspectiveCamera();
    controller = new ClockController(clock, renderer, camera);
  });

  // ── イベントリスナー管理 ──

  describe('イベントリスナー管理', () => {
    it('setEnabled(true) で canvas に4種のイベントリスナーが登録されること', () => {
      const canvas = renderer.domElement;
      const addSpy = vi.spyOn(canvas, 'addEventListener');

      controller.setEnabled(true);

      const eventTypes = addSpy.mock.calls.map((c) => c[0]);
      expect(eventTypes).toContain('pointerdown');
      expect(eventTypes).toContain('pointermove');
      expect(eventTypes).toContain('pointerup');
      expect(eventTypes).toContain('pointercancel');
      expect(addSpy).toHaveBeenCalledTimes(4);
    });

    it('setEnabled(false) で全リスナーが解除されること', () => {
      controller.setEnabled(true);

      const canvas = renderer.domElement;
      const removeSpy = vi.spyOn(canvas, 'removeEventListener');

      controller.setEnabled(false);

      const eventTypes = removeSpy.mock.calls.map((c) => c[0]);
      expect(eventTypes).toContain('pointerdown');
      expect(eventTypes).toContain('pointermove');
      expect(eventTypes).toContain('pointerup');
      expect(eventTypes).toContain('pointercancel');
      expect(removeSpy).toHaveBeenCalledTimes(4);
    });

    it('setEnabled(true) を2回呼んでもリスナーが二重登録されないこと', () => {
      const canvas = renderer.domElement;
      const addSpy = vi.spyOn(canvas, 'addEventListener');

      controller.setEnabled(true);
      controller.setEnabled(true); // 2回目

      // 最初の1回のみ登録される（条件: enabled && !this.enabled）
      expect(addSpy).toHaveBeenCalledTimes(4);
    });

    it('dispose() 後にリスナーが解除されること', () => {
      controller.setEnabled(true);

      const canvas = renderer.domElement;
      const removeSpy = vi.spyOn(canvas, 'removeEventListener');

      controller.dispose();

      expect(removeSpy).toHaveBeenCalledTimes(4);
    });
  });

  // ── 角度ジャンプ抑制 (clampedAngleDelta 間接テスト) ──

  describe('角度ジャンプ抑制', () => {
    it('小さな角度変化（< 60°）が正常に通ること', () => {
      // Set up: minute hand at 12 o'clock, drag a small angle
      clock.setTime({ hours: 12, minutes: 0 });
      const minuteTip = clock.getHandTipPosition('minute');

      // First pointer position: near minute hand tip
      const startPoint = minuteTip.clone();
      setupRaycasterForDrag(startPoint);

      controller.setEnabled(true);
      const onChange = vi.fn();
      controller.onChange(onChange);

      // Simulate pointerdown
      const canvas = renderer.domElement;
      canvas.dispatchEvent(pointerEvent('pointerdown'));

      // Now move by a small angle (~30°, well within 60° threshold)
      const smallAngle = Math.PI / 6; // 30°
      const movedPoint = new THREE.Vector3(
        Math.cos(Math.PI / 2 + smallAngle) * 2,
        Math.sin(Math.PI / 2 + smallAngle) * 2,
        0,
      );
      setupRaycasterForDrag(movedPoint);
      canvas.dispatchEvent(pointerEvent('pointermove'));

      expect(onChange).toHaveBeenCalled();
    });

    it('大きな角度ジャンプ（> 60°）が棄却されること', () => {
      clock.setTime({ hours: 12, minutes: 0 });
      const minuteTip = clock.getHandTipPosition('minute');

      const startPoint = minuteTip.clone();
      setupRaycasterForDrag(startPoint);

      controller.setEnabled(true);
      const onChange = vi.fn();
      controller.onChange(onChange);

      const canvas = renderer.domElement;
      canvas.dispatchEvent(pointerEvent('pointerdown'));

      // Move by a large angle (~120°, exceeds 60° threshold)
      const largeAngle = Math.PI * 2 / 3; // 120°
      const movedPoint = new THREE.Vector3(
        Math.cos(Math.PI / 2 + largeAngle) * 2,
        Math.sin(Math.PI / 2 + largeAngle) * 2,
        0,
      );
      setupRaycasterForDrag(movedPoint);
      canvas.dispatchEvent(pointerEvent('pointermove'));

      // onChange should NOT be called on move (delta rejected)
      expect(onChange).not.toHaveBeenCalled();
    });

    it('π付近のラップアラウンドが正しく正規化されること', () => {
      // Start at angle just past π, move to just before -π
      // This is a small actual change across the ±π boundary
      clock.setTime({ hours: 9, minutes: 0 }); // 9 o'clock: left side
      const minuteTip = clock.getHandTipPosition('minute');

      const startPoint = minuteTip.clone();
      setupRaycasterForDrag(startPoint);

      controller.setEnabled(true);
      const onChange = vi.fn();
      controller.onChange(onChange);

      const canvas = renderer.domElement;
      canvas.dispatchEvent(pointerEvent('pointerdown'));

      // Move slightly (small delta across boundary)
      const nearbyPoint = new THREE.Vector3(
        startPoint.x + 0.1,
        startPoint.y - 0.1,
        0,
      );
      setupRaycasterForDrag(nearbyPoint);
      canvas.dispatchEvent(pointerEvent('pointermove'));

      // Small change should be accepted
      expect(onChange).toHaveBeenCalled();
    });
  });

  // ── ドラッグフロー統合テスト ──

  describe('ドラッグフロー統合テスト', () => {
    it('pointerdown → pointermove → pointerup で onChange が呼ばれること', () => {
      clock.setTime({ hours: 12, minutes: 0 });
      const minuteTip = clock.getHandTipPosition('minute');

      setupRaycasterForDrag(minuteTip.clone());

      controller.setEnabled(true);
      const onChange = vi.fn();
      controller.onChange(onChange);

      const canvas = renderer.domElement;

      // pointerdown
      canvas.dispatchEvent(pointerEvent('pointerdown'));

      // pointermove (small movement)
      const movedPoint = new THREE.Vector3(
        minuteTip.x + 0.2,
        minuteTip.y - 0.1,
        0,
      );
      setupRaycasterForDrag(movedPoint);
      canvas.dispatchEvent(pointerEvent('pointermove'));

      // pointerup
      canvas.dispatchEvent(pointerEvent('pointerup'));

      // onChange should be called (at least on move + on up)
      expect(onChange).toHaveBeenCalled();
    });

    it('enabled = false のとき dragging が開始されないこと', () => {
      clock.setTime({ hours: 12, minutes: 0 });
      const minuteTip = clock.getHandTipPosition('minute');
      setupRaycasterForDrag(minuteTip.clone());

      // Controller not enabled
      const onChange = vi.fn();
      controller.onChange(onChange);

      const canvas = renderer.domElement;
      canvas.dispatchEvent(pointerEvent('pointerdown'));
      canvas.dispatchEvent(pointerEvent('pointermove'));
      canvas.dispatchEvent(pointerEvent('pointerup'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('ドラッグ中に setEnabled(false) すると dragging 状態がリセットされること', () => {
      clock.setTime({ hours: 12, minutes: 0 });
      const minuteTip = clock.getHandTipPosition('minute');
      setupRaycasterForDrag(minuteTip.clone());

      controller.setEnabled(true);
      const onChange = vi.fn();
      controller.onChange(onChange);

      const canvas = renderer.domElement;
      canvas.dispatchEvent(pointerEvent('pointerdown'));

      // Disable during drag
      controller.setEnabled(false);
      onChange.mockClear();

      // Re-enable and try pointermove — should NOT continue old drag
      controller.setEnabled(true);
      canvas.dispatchEvent(pointerEvent('pointermove'));

      // onChange should not be called since drag state was reset
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── スナップ連携 ──

  describe('スナップ連携', () => {
    it('setSnapStep(5) 設定時、pointerup で snapMinutes(5) が呼ばれること', () => {
      clock.setTime({ hours: 12, minutes: 0 });
      const minuteTip = clock.getHandTipPosition('minute');
      setupRaycasterForDrag(minuteTip.clone());

      controller.setEnabled(true);
      controller.setSnapStep(5);

      const snapSpy = vi.spyOn(clock, 'snapMinutes');

      const canvas = renderer.domElement;
      canvas.dispatchEvent(pointerEvent('pointerdown'));

      // Small move to register as minute drag
      const movedPoint = new THREE.Vector3(
        minuteTip.x + 0.2,
        minuteTip.y - 0.1,
        0,
      );
      setupRaycasterForDrag(movedPoint);
      canvas.dispatchEvent(pointerEvent('pointermove'));

      canvas.dispatchEvent(pointerEvent('pointerup'));

      expect(snapSpy).toHaveBeenCalledWith(5);
    });
  });
});
