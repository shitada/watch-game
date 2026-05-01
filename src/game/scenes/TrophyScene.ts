import * as THREE from 'three';
import type { Scene, SceneContext } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';

interface TrophyDef {
  id: string;
  label: string;
  emoji: string;
}

const ALL_TROPHIES: TrophyDef[] = [
  // Quiz trophies
  { id: 'quiz-1-perfect', label: 'なんじかな？ レベル1', emoji: '🥉' },
  { id: 'quiz-2-perfect', label: 'なんじかな？ レベル2', emoji: '🥈' },
  { id: 'quiz-3-perfect', label: 'なんじかな？ レベル3', emoji: '🥇' },
  { id: 'quiz-4-perfect', label: 'なんじかな？ レベル4', emoji: '🏆' },
  // SetTime trophies
  { id: 'setTime-1-perfect', label: 'じかんあわせ レベル1', emoji: '🥉' },
  { id: 'setTime-2-perfect', label: 'じかんあわせ レベル2', emoji: '🥈' },
  { id: 'setTime-3-perfect', label: 'じかんあわせ レベル3', emoji: '🥇' },
  { id: 'setTime-4-perfect', label: 'じかんあわせ レベル4', emoji: '🏆' },
  // Daily trophy
  { id: 'daily-1-perfect', label: 'いちにちチャレンジ', emoji: '👑' },
];

export class TrophyScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private overlay: HTMLDivElement | null = null;

  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;
  private saveManager: SaveManager;

  constructor(
    sceneManager: SceneManager,
    audioManager: AudioManager,
    sfx: SFXGenerator,
    saveManager: SaveManager,
  ) {
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.sfx = sfx;
    this.saveManager = saveManager;

    this.camera.position.set(0, 0, 8);
    this.scene.background = new THREE.Color(0xFDF2E9);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
  }

  enter(_context: SceneContext): void {
    if (this.audioManager.isInitialized()) {
      this.audioManager.startBGM('title');
    }
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

  private buildOverlay(): void {
    const saveData = this.saveManager.load();
    const earned = new Set(saveData.trophies);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      pointer-events: none;
      gap: 16px;
      overflow-y: auto;
    `;

    const title = document.createElement('div');
    title.textContent = '🏆 トロフィー';
    title.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(24px, 5vw, 40px);
      font-weight: 900;
      color: #2C3E50;
      margin-top: 10px;
    `;
    overlay.appendChild(title);

    const count = document.createElement('div');
    count.textContent = `${earned.size} / ${ALL_TROPHIES.length}`;
    count.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(16px, 3vw, 24px);
      color: #7F8C8D;
      font-weight: 700;
    `;
    overlay.appendChild(count);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      max-width: 600px;
      width: 100%;
    `;

    for (const trophy of ALL_TROPHIES) {
      const isEarned = earned.has(trophy.id);

      const card = document.createElement('div');
      card.style.cssText = `
        background: ${isEarned ? 'linear-gradient(180deg, #FEF9E7, #F9E79F)' : 'rgba(200,200,200,0.3)'};
        border: 2px solid ${isEarned ? '#F39C12' : '#BDC3C7'};
        border-radius: 16px;
        padding: 16px 8px;
        text-align: center;
        transition: transform 0.2s;
      `;

      const emoji = document.createElement('div');
      emoji.textContent = isEarned ? trophy.emoji : '❓';
      emoji.style.cssText = `
        font-size: clamp(28px, 6vw, 44px);
        ${isEarned ? '' : 'filter: grayscale(1); opacity: 0.4;'}
      `;

      const label = document.createElement('div');
      label.textContent = isEarned ? trophy.label : '???';
      label.style.cssText = `
        font-family: 'Zen Maru Gothic', sans-serif;
        font-size: clamp(10px, 1.8vw, 13px);
        color: ${isEarned ? '#2C3E50' : '#BDC3C7'};
        font-weight: 700;
        margin-top: 6px;
      `;

      card.appendChild(emoji);
      card.appendChild(label);
      grid.appendChild(card);
    }

    overlay.appendChild(grid);

    // Stats
    const statsEl = document.createElement('div');
    statsEl.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(12px, 2vw, 16px);
      color: #95A5A6;
      font-weight: 700;
      margin-top: 8px;
    `;
    statsEl.textContent = `あそんだかいすう: ${saveData.totalPlays}   せいかいすう: ${saveData.totalCorrect}`;
    overlay.appendChild(statsEl);

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
      margin-bottom: 20px;
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
}
