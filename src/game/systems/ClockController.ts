import * as THREE from 'three';
import { Clock3D, HandType } from '@/game/entities/Clock3D';
import { ClockTime } from '@/types';

export class ClockController {
  private clock: Clock3D;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private raycaster = new THREE.Raycaster();
  private dragging = false;
  private enabled = false;
  private snapStep = 1;
  private onChangeCallback: (() => void) | null = null;

  // Time change detection
  private prevTime: ClockTime | null = null;

  // Hand selection
  private selectedHand: HandType | null = null;
  private prevAngle: number | null = null;
  private static readonly HAND_SELECT_THRESHOLD = 1.2; // world units
  private static readonly MAX_ANGLE_DELTA = Math.PI / 3; // ~60° max per event

  // Reusable objects to avoid GC pressure during pointer events
  private _ndc = new THREE.Vector2();
  private _worldPoint = new THREE.Vector3();
  private _clockPos = new THREE.Vector3();
  private _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private _rayTarget = new THREE.Vector3();
  private _selectClockPos = new THREE.Vector3();
  private _hourTip = new THREE.Vector3();
  private _minuteTip = new THREE.Vector3();
  private _hourMid = new THREE.Vector3();
  private _minuteMid = new THREE.Vector3();

  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: () => void;

  constructor(
    clock: Clock3D,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
  ) {
    this.clock = clock;
    this.renderer = renderer;
    this.camera = camera;

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
  }

  setEnabled(enabled: boolean): void {
    const canvas = this.renderer.domElement;
    if (enabled && !this.enabled) {
      canvas.addEventListener('pointerdown', this.boundPointerDown);
      canvas.addEventListener('pointermove', this.boundPointerMove);
      canvas.addEventListener('pointerup', this.boundPointerUp);
      canvas.addEventListener('pointercancel', this.boundPointerUp);
    } else if (!enabled && this.enabled) {
      canvas.removeEventListener('pointerdown', this.boundPointerDown);
      canvas.removeEventListener('pointermove', this.boundPointerMove);
      canvas.removeEventListener('pointerup', this.boundPointerUp);
      canvas.removeEventListener('pointercancel', this.boundPointerUp);
      this.dragging = false;
      this.selectedHand = null;
      this.prevAngle = null;
      this.prevTime = null;
      this.clock.clearHighlight();
    }
    this.enabled = enabled;
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  setSnapStep(step: number): void {
    this.snapStep = step;
  }

  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  dispose(): void {
    this.setEnabled(false);
    this.onChangeCallback = null;
  }

  private getNDC(e: PointerEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return this._ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private hitTestClock(ndc: THREE.Vector2): boolean {
    this.raycaster.setFromCamera(ndc, this.camera);
    const face = this.clock.getClockFaceMesh();
    if (!face) return false;
    const hits = this.raycaster.intersectObject(face, false);
    return hits.length > 0;
  }

  private getWorldPoint(ndc: THREE.Vector2): THREE.Vector3 {
    this.raycaster.setFromCamera(ndc, this.camera);
    const clockZ = this.clock.group.getWorldPosition(this._rayTarget).z;
    this._plane.normal.set(0, 0, 1);
    this._plane.constant = -clockZ;
    this.raycaster.ray.intersectPlane(this._plane, this._worldPoint);
    return this._worldPoint;
  }

  private getAngleFromPointer(ndc: THREE.Vector2): number {
    const point = this.getWorldPoint(ndc);
    this.clock.group.getWorldPosition(this._clockPos);
    return Math.atan2(point.y - this._clockPos.y, point.x - this._clockPos.x);
  }

  /** Select the hand closest to the touch point */
  private selectHand(ndc: THREE.Vector2): HandType | null {
    const worldPoint = this.getWorldPoint(ndc);

    this._hourTip.copy(this.clock.getHandTipPosition('hour'));
    this._minuteTip.copy(this.clock.getHandTipPosition('minute'));

    const distHour = worldPoint.distanceTo(this._hourTip);
    const distMinute = worldPoint.distanceTo(this._minuteTip);

    // Also check distance to the midpoint of each hand for better hit area
    this.clock.group.getWorldPosition(this._selectClockPos);
    this._hourMid.lerpVectors(this._selectClockPos, this._hourTip, 0.5);
    this._minuteMid.lerpVectors(this._selectClockPos, this._minuteTip, 0.5);

    const distHourMid = worldPoint.distanceTo(this._hourMid);
    const distMinuteMid = worldPoint.distanceTo(this._minuteMid);

    const bestHour = Math.min(distHour, distHourMid);
    const bestMinute = Math.min(distMinute, distMinuteMid);

    const threshold = ClockController.HAND_SELECT_THRESHOLD;
    if (bestHour < threshold || bestMinute < threshold) {
      return bestMinute <= bestHour ? 'minute' : 'hour';
    }
    return null;
  }

  /** Compute smallest signed angle difference, clamped to max delta */
  private clampedAngleDelta(newAngle: number, prevAngle: number): number | null {
    let delta = newAngle - prevAngle;
    // Normalize to [-π, π]
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    if (Math.abs(delta) > ClockController.MAX_ANGLE_DELTA) {
      return null; // Reject large jumps
    }
    return delta;
  }

  private isSameTime(a: ClockTime, b: ClockTime): boolean {
    return a.hours === b.hours && a.minutes === b.minutes;
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    const ndc = this.getNDC(e);
    if (!this.hitTestClock(ndc)) return;

    const hand = this.selectHand(ndc);
    if (hand) {
      this.selectedHand = hand;
      this.dragging = true;
      this.prevAngle = this.getAngleFromPointer(ndc);
      this.prevTime = this.clock.getTime();
      this.clock.highlightHand(hand);
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging || !this.selectedHand || this.prevAngle === null) return;

    const ndc = this.getNDC(e);
    const angle = this.getAngleFromPointer(ndc);

    const delta = this.clampedAngleDelta(angle, this.prevAngle);
    if (delta === null) return; // Skip jump

    this.prevAngle = angle;

    if (this.selectedHand === 'minute') {
      this.clock.setMinuteAngle(angle);
      if (this.snapStep > 1) {
        this.clock.snapMinutes(this.snapStep);
      }
    } else {
      this.clock.setHourAngle(angle);
    }

    const currentTime = this.clock.getTime();
    if (!this.prevTime || !this.isSameTime(currentTime, this.prevTime)) {
      this.prevTime = currentTime;
      this.onChangeCallback?.();
    }
  }

  private onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.prevAngle = null;

    if (this.selectedHand === 'minute' && this.snapStep > 1) {
      this.clock.snapMinutes(this.snapStep);
    }

    const currentTime = this.clock.getTime();
    if (!this.prevTime || !this.isSameTime(currentTime, this.prevTime)) {
      this.onChangeCallback?.();
    }

    this.prevTime = null;
    this.selectedHand = null;
    this.clock.clearHighlight();
  }
}
