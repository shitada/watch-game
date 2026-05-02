import * as THREE from 'three';
import type { Scene, SceneContext } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { Clock3D } from '@/game/entities/Clock3D';

export class TitleScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private clock3D: Clock3D | null = null;
  private overlay: HTMLDivElement | null = null;
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;
  private stars: THREE.Points | null = null;

  constructor(
    sceneManager: SceneManager,
    audioManager: AudioManager,
    sfx: SFXGenerator,
  ) {
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.sfx = sfx;

    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 10);
    this.scene.add(ambient, directional);

    this.scene.background = new THREE.Color(0x87CEEB);
  }

  enter(_context: SceneContext): void {
    // Create clock instance on enter to allow proper disposal on exit
    this.clock3D = new Clock3D();
    // Reset clock
    this.scene.add(this.clock3D.group);
    this.clock3D.group.position.set(0, 0.5, 0);
    this.clock3D.setShowSeconds(true);

    // Set current time
    const now = new Date();
    this.clock3D.setTime({
      hours: now.getHours() % 12 || 12,
      minutes: now.getMinutes(),
    });

    // Background stars
    this.buildStars();

    // UI
    this.buildOverlay();

    // Audio
    if (this.audioManager.isInitialized()) {
      this.audioManager.startBGM('title');
    }
  }

  update(dt: number): void {
    this.clock3D?.update(dt);
    if (this.clock3D) this.clock3D.group.rotation.y = Math.sin(Date.now() * 0.0005) * 0.15;

    // Animate stars
    if (this.stars) {
      this.stars.rotation.z += dt * 0.05;
    }
  }

  exit(): void {
    if (this.clock3D) {
      this.scene.remove(this.clock3D.group);
      // Dispose GPU resources held by clock and clear reference
      this.clock3D.dispose();
      this.clock3D = null;
    }

    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
      this.stars = null;
    }
    this.audioManager.stopBGM();
    this.overlay?.remove();
    this.overlay = null;
  }

  getThreeScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

  private buildStars(): void {
    const count = 50;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = -5 + Math.random() * -5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private buildOverlay(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 2%;
      pointer-events: none;
      gap: 16px;
    `;

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      position: absolute;
      top: 0%;
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(28px, 6vw, 56px);
      font-weight: 900;
      color: #2C3E50;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
      pointer-events: none;
    `;
    title.textContent = '🕐 とけいマスター';
    overlay.appendChild(title);

    // Button container (horizontal)
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 16px;
      pointer-events: auto;
    `;

    // Play button
    const playBtn = this.createButton('あそぶ', '#3498DB', '#2980B9');
    playBtn.addEventListener('click', () => {
      if (!this.audioManager.isInitialized()) {
        this.audioManager.init();
        this.sfx.init(
          this.audioManager.getContext()!,
          this.audioManager.getSFXGain()!,
        );
      }
      this.audioManager.ensureResumed();
      this.sfx.play('buttonTap');
      this.sceneManager.requestTransition('modeSelect');
    });
    btnContainer.appendChild(playBtn);

    // Trophy button
    const trophyBtn = this.createButton('🏆 トロフィー', '#F39C12', '#E67E22');
    trophyBtn.addEventListener('click', () => {
      if (!this.audioManager.isInitialized()) {
        this.audioManager.init();
        this.sfx.init(
          this.audioManager.getContext()!,
          this.audioManager.getSFXGain()!,
        );
      }
      this.audioManager.ensureResumed();
      this.sfx.play('buttonTap');
      this.sceneManager.requestTransition('trophy');
    });
    btnContainer.appendChild(trophyBtn);

    overlay.appendChild(btnContainer);

    const uiOverlay = document.getElementById('ui-overlay')!;
    uiOverlay.appendChild(overlay);
    this.overlay = overlay;
  }

  private createButton(
    text: string,
    color1: string,
    color2: string,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(20px, 4vw, 32px);
      font-weight: 900;
      padding: 16px 48px;
      border: none;
      border-radius: 50px;
      background: linear-gradient(180deg, ${color1}, ${color2});
      color: #fff;
      cursor: pointer;
      pointer-events: auto;
      touch-action: manipulation;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: transform 0.1s;
      min-width: 200px;
    `;
    btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('pointerup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = 'scale(1)';
    });
    return btn;
  }
}
