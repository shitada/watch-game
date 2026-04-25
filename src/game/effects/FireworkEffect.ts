import * as THREE from 'three';

interface Rocket {
  particles: THREE.Points;
  velocities: THREE.Vector3[];
  elapsed: number;
  lifetime: number;
}

export class FireworkEffect {
  private rockets: Rocket[] = [];
  private scene: THREE.Scene | null = null;
  private totalElapsed = 0;
  private active = false;

  trigger(scene: THREE.Scene): void {
    this.cleanup();
    this.scene = scene;
    this.active = true;
    this.totalElapsed = 0;
    this.launchRocket();
  }

  private launchRocket(): void {
    if (!this.scene) return;

    const count = 30;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    const cx = (Math.random() - 0.5) * 4;
    const cy = (Math.random() - 0.5) * 2 + 1;
    const hue = Math.random();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = cx;
      positions[i * 3 + 1] = cy;
      positions[i * 3 + 2] = 0;

      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 2,
        ),
      );

      const c = new THREE.Color().setHSL(hue + Math.random() * 0.1, 1, 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    this.rockets.push({ particles, velocities, elapsed: 0, lifetime: 1.5 });
  }

  update(dt: number): void {
    if (!this.active) return;
    this.totalElapsed += dt;

    // Launch new rockets periodically
    if (this.totalElapsed < 3.0 && Math.random() < dt * 3) {
      this.launchRocket();
    }

    for (let r = this.rockets.length - 1; r >= 0; r--) {
      const rocket = this.rockets[r];
      rocket.elapsed += dt;

      const positions = rocket.particles.geometry.getAttribute('position');
      for (let i = 0; i < rocket.velocities.length; i++) {
        rocket.velocities[i].y -= 3 * dt;
        positions.setX(i, positions.getX(i) + rocket.velocities[i].x * dt);
        positions.setY(i, positions.getY(i) + rocket.velocities[i].y * dt);
        positions.setZ(i, positions.getZ(i) + rocket.velocities[i].z * dt);
      }
      positions.needsUpdate = true;

      const mat = rocket.particles.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - rocket.elapsed / rocket.lifetime);

      if (rocket.elapsed >= rocket.lifetime) {
        if (this.scene) this.scene.remove(rocket.particles);
        rocket.particles.geometry.dispose();
        (rocket.particles.material as THREE.Material).dispose();
        this.rockets.splice(r, 1);
      }
    }

    if (this.totalElapsed >= 4.0 && this.rockets.length === 0) {
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private cleanup(): void {
    for (const rocket of this.rockets) {
      if (this.scene) this.scene.remove(rocket.particles);
      rocket.particles.geometry.dispose();
      (rocket.particles.material as THREE.Material).dispose();
    }
    this.rockets = [];
    this.active = false;
  }
}
