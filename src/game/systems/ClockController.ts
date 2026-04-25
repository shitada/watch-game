import * as THREE from 'three';
import { Clock3D } from '@/game/entities/Clock3D';

export class ClockController {
  private clock: Clock3D;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  private raycaster = new THREE.Raycaster();
  private dragging = false;
  private enabled = false;
  private snapStep = 1;
  private onChangeCallback: (() => void) | null = null;

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
    return new THREE.Vector2(
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

  private getAngleFromPointer(ndc: THREE.Vector2): number {
    this.raycaster.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, point);

    const clockPos = this.clock.group.getWorldPosition(new THREE.Vector3());
    return Math.atan2(point.y - clockPos.y, point.x - clockPos.x);
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    const ndc = this.getNDC(e);
    if (this.hitTestClock(ndc)) {
      this.dragging = true;
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const ndc = this.getNDC(e);
    const angle = this.getAngleFromPointer(ndc);
    this.clock.setMinuteAngle(angle);
    if (this.snapStep > 1) {
      this.clock.snapMinutes(this.snapStep);
    }
    this.onChangeCallback?.();
  }

  private onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.snapStep > 1) {
      this.clock.snapMinutes(this.snapStep);
    }
    this.onChangeCallback?.();
  }
}
