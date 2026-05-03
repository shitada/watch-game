import * as THREE from 'three';
import type { ClockTime } from '@/types';

export class HintEffect {
  private points: THREE.Points | null = null;
  private elapsed = 0;
  private duration = 2.0;
  private scene: THREE.Scene | null = null;

  trigger(scene: THREE.Scene, time: ClockTime, center: THREE.Vector3): void {
    this.cleanup();
    this.scene = scene;
    this.elapsed = 0;

    // Compute angles for hour and minute hands
    const hourAngle = ((time.hours % 12) + time.minutes / 60) / 12 * Math.PI * 2;
    const minuteAngle = (time.minutes / 60) * Math.PI * 2;

    const radius = 1.6;
    const positions: number[] = [];
    const colors: number[] = [];

    const palette = [new THREE.Color(0x58D68D), new THREE.Color(0xF4D03F)];

    // create a small cluster at hour and minute positions
    const clusters = [hourAngle, minuteAngle];
    clusters.forEach((angle, ci) => {
      for (let i = 0; i < 8; i++) {
        const a = angle + (Math.random() - 0.5) * 0.4 + (i - 4) * 0.03;
        const r = radius + Math.random() * 0.2;
        const x = center.x + Math.cos(a) * r;
        const y = center.y + Math.sin(a) * r * 0.7;
        const z = center.z + 0.2 + Math.random() * 0.2;
        positions.push(x, y, z);
        const c = palette[ci % palette.length];
        colors.push(c.r, c.g, c.b);
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
  }

  update(dt: number): void {
    if (!this.points) return;
    this.elapsed += dt;

    // simple upward motion and fade
    const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, positions.getY(i) + dt * 0.2);
    }
    positions.needsUpdate = true;

    const mat = this.points.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - this.elapsed / this.duration);

    if (this.elapsed >= this.duration) {
      this.cleanup();
    }
  }

  dispose(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.points && this.scene) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    this.points = null;
    this.scene = null;
    this.elapsed = 0;
  }
}
