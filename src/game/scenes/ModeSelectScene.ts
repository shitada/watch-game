import * as THREE from 'three';
import type { Scene, SceneContext, GameMode } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { LEVELS } from '@/game/config/LevelConfig';

interface ModeCard {
  mode: GameMode;
  label: string;
  emoji: string;
  description: string;
  color1: string;
  color2: string;
  hasLevels: boolean;
}

const MODES: ModeCard[] = [
  {
    mode: 'quiz',
    label: 'なんじかな？',
    emoji: '🤔',
    description: 'とけいの はりが さしている\nじかんを あてよう！',
    color1: '#3498DB',
    color2: '#2980B9',
    hasLevels: true,
  },
  {
    mode: 'setTime',
    label: 'じかんをあわせよう！',
    emoji: '🕐',
    description: 'はりを うごかして\nじかんを あわせよう！',
    color1: '#2ECC71',
    color2: '#27AE60',
    hasLevels: true,
  },
  {
    mode: 'daily',
    label: 'いちにちチャレンジ',
    emoji: '📅',
    description: 'いちにちの スケジュールに\nあわせよう！',
    color1: '#E67E22',
    color2: '#D35400',
    hasLevels: false,
  },
];

export class ModeSelectScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private overlay: HTMLDivElement | null = null;
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;

  constructor(
    sceneManager: SceneManager,
    audioManager: AudioManager,
    sfx: SFXGenerator,
    private saveManager: SaveManager,
  ) {
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.sfx = sfx;

    this.camera.position.set(0, 0, 8);
    this.scene.background = new THREE.Color(0x87CEEB);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
  }

  enter(_context: SceneContext): void {
    this.audioManager.startBGM('title');
    this.buildOverlay();
  }

  update(_dt: number): void {}

  exit(): void {
    this.audioManager.stopBGM();
    this.overlay?.remove();
    this.overlay = null;
  }

  getThreeScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

  // Static UI scene — continuous rendering not required
  needsContinuousRendering(): boolean { return false; }

  private buildOverlay(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      pointer-events: none;
      gap: 16px;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = 'モードをえらぼう！';
    title.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(22px, 4.5vw, 36px);
      font-weight: 900;
      color: #2C3E50;
      margin-bottom: 12px;
    `;
    overlay.appendChild(title);

    // Mode cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 900px;
      pointer-events: auto;
    `;

    for (const mode of MODES) {
      const card = this.createCard(mode);
      cardsContainer.appendChild(card);
    }
    overlay.appendChild(cardsContainer);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← もどる';
    backBtn.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(14px, 2.5vw, 20px);
      font-weight: 700;
      padding: 10px 28px;
      border: 2px solid #BDC3C7;
      border-radius: 30px;
      background: rgba(255,255,255,0.9);
      color: #7F8C8D;
      cursor: pointer;
      pointer-events: auto;
      touch-action: manipulation;
      margin-top: 8px;
    `;
    backBtn.addEventListener('click', () => {
      this.sfx.play('buttonTap');
      this.sceneManager.requestTransition('title');
    });
    overlay.appendChild(backBtn);

    const uiOverlay = document.getElementById('ui-overlay')!;
    uiOverlay.appendChild(overlay);
    this.overlay = overlay;
  }

  private createCard(mode: ModeCard): HTMLDivElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(180deg, ${mode.color1}, ${mode.color2});
      border-radius: 20px;
      padding: 20px 24px;
      min-width: 220px;
      max-width: 260px;
      flex: 1;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transition: transform 0.15s;
      text-align: center;
    `;

    const emoji = document.createElement('div');
    emoji.textContent = mode.emoji;
    emoji.style.fontSize = 'clamp(36px, 7vw, 56px)';

    const label = document.createElement('div');
    label.textContent = mode.label;
    label.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(16px, 3vw, 22px);
      font-weight: 900;
      color: #fff;
      margin: 8px 0;
    `;

    const desc = document.createElement('div');
    desc.textContent = mode.description;
    desc.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(11px, 2vw, 14px);
      color: rgba(255,255,255,0.9);
      white-space: pre-line;
      line-height: 1.5;
    `;

    card.setAttribute('data-mode', mode.mode);
    card.appendChild(emoji);
    card.appendChild(label);
    card.appendChild(desc);

    // Progress badge
    const badge = document.createElement('div');
    const saveData = this.saveManager.load();
    if (mode.hasLevels) {
      const completed = saveData.completedLevels[mode.mode]?.length ?? 0;
      badge.textContent = `★ ${completed}/${LEVELS.length}`;
    } else {
      const completed = saveData.completedLevels[mode.mode]?.length ?? 0;
      badge.textContent = completed > 0 ? '✅ クリア' : '— みプレイ';
    }
    badge.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(11px, 2vw, 14px);
      color: rgba(255,255,255,0.95);
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      padding: 4px 12px;
      margin-top: 8px;
      display: inline-block;
    `;
    card.appendChild(badge);

    card.addEventListener('pointerdown', () => {
      card.style.transform = 'scale(0.96)';
    });
    card.addEventListener('pointerup', () => {
      card.style.transform = 'scale(1)';
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = 'scale(1)';
    });

    card.addEventListener('click', () => {
      this.sfx.play('buttonTap');
      if (mode.hasLevels) {
        this.sceneManager.requestTransition('levelSelect', { mode: mode.mode });
      } else {
        this.sceneManager.requestTransition('dailyPlay', { mode: mode.mode });
      }
    });

    return card;
  }
}
