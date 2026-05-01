import * as THREE from 'three';
import type { Scene, SceneContext, GameMode, SceneType } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { LEVELS } from '@/game/config/LevelConfig';

export class LevelSelectScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private overlay: HTMLDivElement | null = null;
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;
  private saveManager: SaveManager;
  private currentMode: GameMode = 'quiz';

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
    this.scene.background = new THREE.Color(0x87CEEB);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);
  }

  enter(context: SceneContext): void {
    this.currentMode = context.mode ?? 'quiz';
    this.buildOverlay();
  }

  update(_dt: number): void {}

  exit(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  getThreeScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

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

    const modeLabel = this.currentMode === 'quiz' ? 'なんじかな？' : 'じかんをあわせよう！';
    const title = document.createElement('div');
    title.textContent = `${modeLabel} — レベルをえらぼう！`;
    title.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(18px, 3.5vw, 30px);
      font-weight: 900;
      color: #2C3E50;
      margin-bottom: 8px;
    `;
    overlay.appendChild(title);

    const saveData = this.saveManager.load();
    const completed = saveData.completedLevels[this.currentMode] ?? [];

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      max-width: 600px;
      pointer-events: auto;
    `;

    for (const levelDef of LEVELS) {
      const isDone = completed.includes(levelDef.level);
      const stars = '★'.repeat(levelDef.level) + '☆'.repeat(4 - levelDef.level);

      const card = document.createElement('button');
      card.style.cssText = `
        position: relative;
        font-family: 'Zen Maru Gothic', sans-serif;
        padding: 16px 20px;
        border: 3px solid ${isDone ? '#27AE60' : '#3498DB'};
        border-radius: 16px;
        background: ${isDone ? 'linear-gradient(180deg, #A9DFBF, #D5F5E3)' : 'linear-gradient(180deg, #fff, #EBF5FB)'};
        cursor: pointer;
        touch-action: manipulation;
        text-align: center;
        transition: transform 0.1s;
      `;

      const starsEl = document.createElement('div');
      starsEl.textContent = stars;
      starsEl.style.cssText = `
        font-size: clamp(16px, 3vw, 24px);
        color: #F39C12;
        margin-bottom: 4px;
      `;

      const nameEl = document.createElement('div');
      nameEl.textContent = `${isDone ? '✅ ' : ''}${levelDef.name}`;
      nameEl.style.cssText = `
        font-size: clamp(16px, 3vw, 22px);
        font-weight: 900;
        color: #2C3E50;
        margin-bottom: 4px;
      `;

      const descEl = document.createElement('div');
      descEl.textContent = levelDef.description;
      descEl.style.cssText = `
        font-size: clamp(11px, 2vw, 14px);
        color: #7F8C8D;
      `;

      card.appendChild(starsEl);
      card.appendChild(nameEl);
      card.appendChild(descEl);

      // Best score display
      const scoreKey = `${this.currentMode}-${levelDef.level}`;
      const bestScore = saveData.bestScores[scoreKey] ?? null;
      if (bestScore !== null) {
        const scoreEl = document.createElement('div');
        scoreEl.textContent = `🎯 ${bestScore}/${levelDef.questionCount}`;
        scoreEl.style.cssText = `
          font-size: clamp(11px, 2vw, 14px);
          color: #3498DB;
          font-weight: 700;
          margin-top: 6px;
        `;
        card.appendChild(scoreEl);
      }

      // Trophy badge
      const trophyKey = `${this.currentMode}-${levelDef.level}-perfect`;
      const hasTrophy = saveData.trophies.includes(trophyKey);
      if (hasTrophy) {
        const trophyEl = document.createElement('div');
        trophyEl.textContent = '🏆';
        trophyEl.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: clamp(16px, 3vw, 24px);
        `;
        card.appendChild(trophyEl);
      }

      card.addEventListener('pointerdown', () => {
        card.style.transform = 'scale(0.95)';
      });
      card.addEventListener('pointerup', () => {
        card.style.transform = 'scale(1)';
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = 'scale(1)';
      });

      card.addEventListener('click', () => {
        this.sfx.play('buttonTap');
        const target: SceneType =
          this.currentMode === 'quiz' ? 'quizPlay' : 'setTimePlay';
        this.sceneManager.requestTransition(target, {
          mode: this.currentMode,
          level: levelDef.level,
        });
      });

      grid.appendChild(card);
    }

    overlay.appendChild(grid);

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
      this.sceneManager.requestTransition('modeSelect');
    });
    overlay.appendChild(backBtn);

    const uiOverlay = document.getElementById('ui-overlay')!;
    uiOverlay.appendChild(overlay);
    this.overlay = overlay;
  }
}
