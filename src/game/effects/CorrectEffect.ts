import * as THREE from 'three';

export class CorrectEffect {
  private particles: THREE.Points | null = null;
  private velocities: THREE.Vector3[] = [];
  private elapsed = 0;
  private active = false;
  private scene: THREE.Scene | null = null;

  trigger(scene: THREE.Scene, position: THREE.Vector3): void {
    this.cleanup();
    this.scene = scene;
    this.active = true;
    this.elapsed = 0;

    const count = 20;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.velocities = [];

    const palette = [
      new THREE.Color(0x2ECC71), // green
      new THREE.Color(0xF1C40F), // yellow
      new THREE.Color(0x3498DB), // blue
      new THREE.Color(0xE74C3C), // red
      new THREE.Color(0x9B59B6), // purple
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      this.velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 3,
        ),
      );

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
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

    const positions = this.particles.geometry.getAttribute('position');
    for (let i = 0; i < this.velocities.length; i++) {
      this.velocities[i].y -= 5 * dt; // gravity
      positions.setX(i, positions.getX(i) + this.velocities[i].x * dt);
      positions.setY(i, positions.getY(i) + this.velocities[i].y * dt);
      positions.setZ(i, positions.getZ(i) + this.velocities[i].z * dt);
    }
    positions.needsUpdate = true;

    const mat = this.particles.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - this.elapsed / 1.0);

    if (this.elapsed >= 1.0) {
      this.cleanup();
    }
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
    this.velocities = [];
  }
}
