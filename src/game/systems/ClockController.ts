import * as THREE from 'three';
import { Clock3D, HandType } from '@/game/entities/Clock3D';
import { ClockTime } from '@/types';
import { GameSettings } from '@/game/config/GameSettings';

/**
 * Convert a pixel distance on the canvas to world-space distance at planeZ.
 * This implementation avoids THREE.Ray.intersectPlane to remain test-friendly
 * by using unproject-based ray math.
 */
export function pixelsToWorldDistance(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  pixels: number,
  planeZ: number,
): number {
  const EPS = 1e-6;
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const toWorld = (clientX: number, clientY: number): THREE.Vector3 | null => {
    // NDC coords
    const ndc = new THREE.Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      0.5,
    );

    // Unproject to a point in world space at an arbitrary depth, then form a ray
    const worldPoint = ndc.clone().unproject(camera);
    const camPos = new THREE.Vector3();
    (camera as any).getWorldPosition(camPos);
    const dir = worldPoint.sub(camPos).normalize();

    // If ray is nearly parallel to the plane (dir.z ≈ 0) we cannot reliably intersect
    if (Math.abs(dir.z) < EPS) return null;

    // Intersect with plane z = planeZ: camPos.z + t * dir.z = planeZ => t = (planeZ - camPos.z)/dir.z
    const t = (planeZ - camPos.z) / dir.z;
    if (!Number.isFinite(t)) return null;
    return camPos.add(dir.multiplyScalar(t));
  };

  const pCenter = toWorld(cx, cy);
  const pRight = toWorld(cx + pixels, cy);
  const pDown = toWorld(cx, cy + pixels);

  // If any intersection failed due to near-parallel ray, fallback to camera-type based approximation
  if (pCenter && pRight && pDown) {
    const dx = pCenter.distanceTo(pRight);
    const dy = pCenter.distanceTo(pDown);
    const result = Math.sqrt(dx * dx + dy * dy);
    if (!Number.isFinite(result) || result <= 0) return 1.2;
    return result;
  }

  // Fallback: approximate world size per pixel at planeZ depending on camera
  const canvasW = rect.width;
  const canvasH = rect.height;

  let perPixelX = 1;
  let perPixelY = 1;

  if ((camera as any).isOrthographicCamera || camera instanceof THREE.OrthographicCamera) {
    const o = camera as THREE.OrthographicCamera;
    const zoom = (o as any).zoom ?? 1;
    const worldHeight = (o.top - o.bottom) / zoom;
    const worldWidth = (o.right - o.left) / zoom;
    perPixelY = worldHeight / canvasH;
    perPixelX = worldWidth / canvasW;
  } else if ((camera as any).isPerspectiveCamera || camera instanceof THREE.PerspectiveCamera) {
    const p = camera as THREE.PerspectiveCamera;
    const camPos = new THREE.Vector3();
    (camera as any).getWorldPosition(camPos);
    let distance = Math.abs(planeZ - camPos.z);
    if (distance < EPS) distance = EPS; // avoid zero
    const vFov = THREE.MathUtils.degToRad(p.fov);
    const worldHeight = 2 * distance * Math.tan(vFov / 2);
    const worldWidth = worldHeight * (canvasW / canvasH);
    perPixelY = worldHeight / canvasH;
    perPixelX = worldWidth / canvasW;
  } else {
    // Unknown camera type — return safe default
    return 1.2;
  }

  const dx = perPixelX * pixels;
  const dy = perPixelY * pixels;
  const approx = Math.sqrt(dx * dx + dy * dy);
  if (!Number.isFinite(approx) || approx <= 0) return 1.2;
  return approx;
}

export class ClockController {
  private clock: Clock3D;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private raycaster = new THREE.Raycaster();
  private dragging = false;
  private enabled = false;
  private snapStep = 1;
  private onChangeCallback: (() => void) | null = null;

  // Track active pointer capture to ensure we always release it
  private activePointerId: number | null = null;

  // Time change detection
  private prevTime: ClockTime | null = null;

  // Hand selection
  private selectedHand: HandType | null = null;
  private prevAngle: number | null = null;
  private static readonly MAX_ANGLE_DELTA = Math.PI / 3; // ~60° max per event
  private touchWorldThreshold: number | null = null;

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
  private boundPointerUp: (e?: PointerEvent) => void;
  private boundOnResize: () => void;

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
    this.boundOnResize = this.invalidateThreshold.bind(this);
  }

  setEnabled(enabled: boolean): void {
    const canvas = this.renderer.domElement as HTMLCanvasElement;
    if (enabled && !this.enabled) {
      canvas.addEventListener('pointerdown', this.boundPointerDown);
      canvas.addEventListener('pointermove', this.boundPointerMove);
      canvas.addEventListener('pointerup', this.boundPointerUp);
      canvas.addEventListener('pointercancel', this.boundPointerUp);
      // Listen for resizes to invalidate cached threshold
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('resize', this.boundOnResize);
      }
    } else if (!enabled && this.enabled) {
      canvas.removeEventListener('pointerdown', this.boundPointerDown);
      canvas.removeEventListener('pointermove', this.boundPointerMove);
      canvas.removeEventListener('pointerup', this.boundPointerUp);
      canvas.removeEventListener('pointercancel', this.boundPointerUp);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', this.boundOnResize);
      }
      // Ensure we release any active pointer capture when disabling
      if (this.activePointerId != null) {
        try {
          if (typeof canvas.releasePointerCapture === 'function') {
            canvas.releasePointerCapture(this.activePointerId);
          }
        } catch (err) {
          // swallow — best effort
        }
        this.activePointerId = null;
      }
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
    this.invalidateThreshold();
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

  private invalidateThreshold(): void {
    this.touchWorldThreshold = null;
  }

  private ensureThreshold(): void {
    if (this.touchWorldThreshold != null) return;
    try {
      const canvas = this.renderer.domElement as HTMLCanvasElement;
      const clockZ = this.clock.group.getWorldPosition(this._rayTarget).z;
      this.touchWorldThreshold = pixelsToWorldDistance(
        canvas,
        this.camera,
        GameSettings.TOUCH_TARGET_PX,
        clockZ,
      );
      // Guard against non-finite results from geometric calculations (e.g. camera at origin)
      if (!Number.isFinite(this.touchWorldThreshold) || this.touchWorldThreshold <= 0) {
        this.touchWorldThreshold = 1.2;
      }
    } catch (err) {
      // Fallback to previous fixed value in unlikely failure
      this.touchWorldThreshold = 1.2;
    }
  }

  /** Select the hand closest to the touch point */
  private selectHand(ndc: THREE.Vector2): HandType | null {
    const worldPoint = this.getWorldPoint(ndc);

    this.clock.getHandTipPosition('hour', this._hourTip);
    this.clock.getHandTipPosition('minute', this._minuteTip);

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

    this.ensureThreshold();
    const threshold = this.touchWorldThreshold ?? 1.2;

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

  private tryReleasePointerCapture(id: number | null): void {
    if (id == null) return;
    const canvas = this.renderer.domElement as HTMLElement;
    try {
      if (typeof canvas.releasePointerCapture === 'function') {
        canvas.releasePointerCapture(id);
      }
    } catch (err) {
      // swallow - best effort
    }
    this.activePointerId = null;
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
      try {
        const canvas = this.renderer.domElement as HTMLElement;
        if (typeof canvas.setPointerCapture === 'function') {
          canvas.setPointerCapture(e.pointerId);
          this.activePointerId = e.pointerId;
        }
      } catch (err) {
        // ignore - not supported or failed
      }
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

  private onPointerUp(e?: PointerEvent): void {
    if (!this.dragging) {
      // Even if not dragging, still attempt to release any capture identified by event
      const id = e?.pointerId ?? this.activePointerId;
      if (id != null) this.tryReleasePointerCapture(id);
      return;
    }

    this.dragging = false;
    this.prevAngle = null;

    if (this.selectedHand === 'minute' && this.snapStep > 1) {
      this.clock.snapMinutes(this.snapStep);
    }

    const currentTime = this.clock.getTime();
    if (!this.prevTime || !this.isSameTime(currentTime, this.prevTime)) {
      this.onChangeCallback?.();
    }

    // Release pointer capture for this pointer (use event.pointerId if available, otherwise stored id)
    const id = e?.pointerId ?? this.activePointerId;
    if (id != null) this.tryReleasePointerCapture(id);

    this.prevTime = null;
    this.selectedHand = null;
    this.clock.clearHighlight();
  }
}
