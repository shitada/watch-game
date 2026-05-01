import * as THREE from 'three';

export class IncorrectEffect {
  private particles: THREE.Points | null = null;
  private elapsed = 0;
  private active = false;
  private scene: THREE.Scene | null = null;

  trigger(scene: THREE.Scene, position: THREE.Vector3): void {
    this.cleanup();
    this.scene = scene;
    this.active = true;
    this.elapsed = 0;

    const count = 8;
    const positions = new Float32Array(count * 3);

    // Create an X pattern
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) * 2 - 1;
      const side = i % 2 === 0 ? 1 : -1;
      positions[i * 3] = position.x + t * 0.5;
      positions[i * 3 + 1] = position.y + t * side * 0.5;
      positions[i * 3 + 2] = position.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      color: 0xE74C3C,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    scene.add(this.particles);
  }

  update(dt: number): void {
    if (!this.active || !this.particles) return;
    this.elapsed += dt;

    const mat = this.particles.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - this.elapsed / 0.6);

    // Gentle shake
    this.particles.position.x = Math.sin(this.elapsed * 30) * 0.05;

    if (this.elapsed >= 0.6) {
      this.cleanup();
    }
  }

  /** 外部からリソースを解放する。シーン exit() 時に呼ぶ。 */
  dispose(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.particles && this.scene) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    this.particles = null;
    this.scene = null;
    this.active = false;
  }
}
