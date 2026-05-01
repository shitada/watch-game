import * as THREE from 'three';
import type { ClockTime } from '@/types';
import { GameSettings } from '@/game/config/GameSettings';

const S = GameSettings;

export type HandType = 'hour' | 'minute';

export class Clock3D {
  readonly group = new THREE.Group();
  private hourHand!: THREE.Mesh;
  private minuteHand!: THREE.Mesh;
  private secondHand!: THREE.Mesh;
  private currentTime: ClockTime = { hours: 12, minutes: 0 };
  private showSeconds = false;
  private secondAngle = 0;
  private originalHourColor = S.COLORS.hourHand;
  private originalMinuteColor = S.COLORS.minuteHand;

  constructor() {
    this.buildClockFace();
    this.buildTicks();
    this.buildNumbers();
    this.buildHands();
    this.setTime({ hours: 12, minutes: 0 });
  }

  private buildClockFace(): void {
    // Back plate
    const faceGeo = new THREE.CircleGeometry(S.CLOCK_RADIUS, 64);
    const faceMat = new THREE.MeshStandardMaterial({
      color: S.COLORS.clockFace,
      side: THREE.DoubleSide,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.name = 'clockFace';
    this.group.add(face);

    // Rim
    const rimGeo = new THREE.RingGeometry(
      S.CLOCK_RADIUS - 0.05,
      S.CLOCK_RADIUS + 0.1,
      64,
    );
    const rimMat = new THREE.MeshStandardMaterial({
      color: S.COLORS.clockRim,
      side: THREE.DoubleSide,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.z = 0.01;
    this.group.add(rim);
  }

  private buildTicks(): void {
    for (let i = 0; i < 60; i++) {
      const isMajor = i % 5 === 0;
      const length = isMajor ? 0.25 : 0.12;
      const width = isMajor ? 0.06 : 0.02;
      const color = isMajor ? S.COLORS.tickMajor : S.COLORS.tickMinor;

      const geo = new THREE.PlaneGeometry(width, length);
      const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
      const tick = new THREE.Mesh(geo, mat);

      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const radius = S.CLOCK_RADIUS - 0.2 - length / 2;
      tick.position.set(
        Math.cos(-angle) * radius,
        Math.sin(-angle) * radius,
        0.02,
      );
      tick.rotation.z = -angle - Math.PI / 2;
      this.group.add(tick);
    }
  }

  private buildNumbers(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 512);

    ctx.font = 'bold 42px "Zen Maru Gothic", sans-serif';
    ctx.fillStyle = '#2C3E50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = 256;
    const centerY = 256;
    const numRadius = 185;

    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * numRadius;
      const y = centerY + Math.sin(angle) * numRadius;
      ctx.fillText(String(i), x, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const numGeo = new THREE.PlaneGeometry(
      S.CLOCK_RADIUS * 2,
      S.CLOCK_RADIUS * 2,
    );
    const numMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const numbers = new THREE.Mesh(numGeo, numMat);
    numbers.position.z = 0.03;
    this.group.add(numbers);
  }

  private buildHands(): void {
    // Hour hand
    this.hourHand = this.createHand(
      S.HOUR_HAND_LENGTH,
      S.HAND_WIDTH_HOUR,
      S.COLORS.hourHand,
      0.04,
    );
    this.group.add(this.hourHand);

    // Minute hand
    this.minuteHand = this.createHand(
      S.MINUTE_HAND_LENGTH,
      S.HAND_WIDTH_MINUTE,
      S.COLORS.minuteHand,
      0.05,
    );
    this.group.add(this.minuteHand);

    // Second hand
    this.secondHand = this.createHand(
      S.SECOND_HAND_LENGTH,
      S.HAND_WIDTH_SECOND,
      S.COLORS.secondHand,
      0.06,
    );
    this.secondHand.visible = this.showSeconds;
    this.group.add(this.secondHand);

    // Center cap
    const capGeo = new THREE.CircleGeometry(0.12, 32);
    const capMat = new THREE.MeshStandardMaterial({
      color: S.COLORS.center,
      side: THREE.DoubleSide,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.z = 0.07;
    this.group.add(cap);
  }

  private createHand(
    length: number,
    width: number,
    color: number,
    zPos: number,
  ): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -0.15);
    shape.lineTo(0, length);
    shape.lineTo(width / 2, -0.15);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = zPos;
    return mesh;
  }

  setTime(time: ClockTime): void {
    this.currentTime = { ...time };

    // Minute hand: 360° / 60 = 6° per minute
    const minuteAngle = -(time.minutes / 60) * Math.PI * 2;
    this.minuteHand.rotation.z = minuteAngle;

    // Hour hand: 360° / 12 = 30° per hour + minute offset
    const hourAngle =
      -((time.hours % 12) / 12 + time.minutes / 720) * Math.PI * 2;
    this.hourHand.rotation.z = hourAngle;
  }

  getTime(): ClockTime {
    return { ...this.currentTime };
  }

  setShowSeconds(show: boolean): void {
    this.showSeconds = show;
    this.secondHand.visible = show;
  }

  update(deltaTime: number): void {
    if (this.showSeconds) {
      this.secondAngle -= deltaTime * ((Math.PI * 2) / 60);
      this.secondHand.rotation.z = this.secondAngle;
    }
  }

  /** Convert a pointer angle (radians from center, 0=right, CCW positive) to ClockTime */
  angleToMinutes(angle: number): number {
    // Convert so 12 o'clock (top) = 0, clockwise = positive
    let normalized = -angle + Math.PI / 2;
    while (normalized < 0) normalized += Math.PI * 2;
    while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
    return Math.round((normalized / (Math.PI * 2)) * 60) % 60;
  }

  setMinuteAngle(angle: number): void {
    const minutes = this.angleToMinutes(angle);
    // Detect hour increment: if minute wraps past 0
    const prevMin = this.currentTime.minutes;
    let hours = this.currentTime.hours;

    if (prevMin > 45 && minutes < 15) {
      hours = (hours % 12) + 1;
      if (hours > 12) hours = 1;
    } else if (prevMin < 15 && minutes > 45) {
      hours = hours - 1;
      if (hours < 1) hours = 12;
    }

    this.setTime({ hours, minutes });
  }

  snapMinutes(step: number): void {
    const snapped = Math.round(this.currentTime.minutes / step) * step;
    let hours = this.currentTime.hours;
    let minutes = snapped;
    if (minutes >= 60) {
      minutes = 0;
      hours = (hours % 12) + 1;
    }
    this.setTime({ hours, minutes });
  }

  /** Set hour hand angle directly from pointer angle (radians, 0=right, CCW positive) */
  setHourAngle(angle: number): void {
    let normalized = -angle + Math.PI / 2;
    while (normalized < 0) normalized += Math.PI * 2;
    while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
    const hours = Math.round((normalized / (Math.PI * 2)) * 12) % 12 || 12;
    this.setTime({ hours, minutes: this.currentTime.minutes });
  }

  /** Get the tip position of the specified hand in world coordinates */
  getHandTipPosition(hand: HandType): THREE.Vector3 {
    const mesh = hand === 'hour' ? this.hourHand : this.minuteHand;
    const length = hand === 'hour' ? S.HOUR_HAND_LENGTH : S.MINUTE_HAND_LENGTH;
    // Hand is oriented along +Y in local space
    const localTip = new THREE.Vector3(0, length, 0);
    return mesh.localToWorld(localTip);
  }

  /** Highlight the specified hand by brightening its color */
  highlightHand(hand: HandType): void {
    this.clearHighlight();
    const mesh = hand === 'hour' ? this.hourHand : this.minuteHand;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.set(0x444444);
    mat.emissiveIntensity = 0.6;
  }

  /** Clear any hand highlight */
  clearHighlight(): void {
    for (const mesh of [this.hourHand, this.minuteHand]) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.set(0x000000);
      mat.emissiveIntensity = 0;
    }
  }

  getClockFaceMesh(): THREE.Object3D | undefined {
    return this.group.getObjectByName('clockFace');
  }
}
