import * as THREE from 'three';
import type { Scene, SceneContext, QuizResult } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { FireworkEffect } from '@/game/effects/FireworkEffect';
import { LEVELS } from '@/game/config/LevelConfig';

export class ResultScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private overlay: HTMLDivElement | null = null;
  private fireworkEffect = new FireworkEffect();

  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;
  private saveManager: SaveManager;

  private results: QuizResult[] = [];
  private mode: string = 'quiz';
  private level = 1;
  private isNewTrophy = false;

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

  enter(context: SceneContext): void {
    this.results = context.results ?? [];
    this.mode = context.mode ?? 'quiz';
    this.level = context.level ?? 1;

    const total = this.results.length;
    const correct = this.results.filter(r => r.correct).length;
    const ratio = total > 0 ? correct / total : 0;

    // Save progress
    if (ratio >= 0.6 && this.mode !== 'daily') {
      this.saveManager.addCompletedLevel(
        this.mode as 'quiz' | 'setTime',
        this.level,
      );
    }
    if (this.mode === 'daily' && ratio >= 0.6) {
      this.saveManager.addCompletedLevel('daily', 1);
    }

    const scoreKey = `${this.mode}-${this.level}`;
    this.saveManager.updateBestScore(scoreKey, correct);
    this.saveManager.incrementStats(correct);

    // Trophy — addTrophy() 前に load() で既存トロフィーを確認し新規判定する
    this.isNewTrophy = false;
    if (ratio === 1) {
      const trophyId = `${this.mode}-${this.level}-perfect`;
      const existing = this.saveManager.load();
      if (!existing.trophies.includes(trophyId)) {
        this.isNewTrophy = true;
      }
      this.saveManager.addTrophy(trophyId);
    }

    // BGM
    this.audioManager.startBGM('result');

    // SFX
    if (ratio === 1) {
      this.sfx.play('allClear');
      this.fireworkEffect.trigger(this.scene);
    } else if (ratio >= 0.6) {
      this.sfx.play('levelClear');
    }

    // Build UI
    this.buildOverlay(correct, total, ratio);
  }

  update(dt: number): void {
    this.fireworkEffect.update(dt);
  }

  exit(): void {
    this.fireworkEffect.dispose();
    this.audioManager.stopBGM();
    this.overlay?.remove();
    this.overlay = null;
    this.isNewTrophy = false;
  }

  dispose(): void { this.exit(); }

  getThreeScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

  // Returns whether this scene requires continuous rendering (e.g., active particle effects).
  // SceneManager can call this to decide whether to keep the render loop running.
  needsContinuousRendering(): boolean {
    return this.fireworkEffect.isActive();
  }

  private buildOverlay(correct: number, total: number, ratio: number): void {
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

    // Result title
    const title = document.createElement('div');
    title.textContent = 'けっか';
    title.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(24px, 5vw, 40px);
      font-weight: 900;
      color: #2C3E50;
    `;
    overlay.appendChild(title);

    // Stars
    const stars = ratio === 1 ? '★★★' : ratio >= 0.8 ? '★★☆' : ratio >= 0.6 ? '★☆☆' : '☆☆☆';
    const starsEl = document.createElement('div');
    starsEl.textContent = stars;
    starsEl.style.cssText = `
      font-size: clamp(36px, 8vw, 64px);
      color: #F39C12;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    `;
    overlay.appendChild(starsEl);

    // Score
    const scoreEl = document.createElement('div');
    scoreEl.textContent = `${correct} / ${total} もん せいかい！`;
    scoreEl.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(20px, 4vw, 32px);
      font-weight: 900;
      color: #2C3E50;
    `;
    overlay.appendChild(scoreEl);

    // Message
    const msgEl = document.createElement('div');
    if (ratio === 1) {
      msgEl.textContent = '🎉 パーフェクト！すごい！';
    } else if (ratio >= 0.8) {
      msgEl.textContent = '👏 とてもよくできました！';
    } else if (ratio >= 0.6) {
      msgEl.textContent = '😊 よくがんばったね！';
    } else {
      msgEl.textContent = '💪 もういちど チャレンジしよう！';
    }
    msgEl.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(16px, 3vw, 24px);
      color: #7F8C8D;
      font-weight: 700;
    `;
    overlay.appendChild(msgEl);

    // Trophy notification (new trophy only)
    if (this.isNewTrophy) {
      const trophyEl = document.createElement('div');
      trophyEl.textContent = '🏆 トロフィーゲット！';
      trophyEl.style.cssText = `
        font-family: 'Zen Maru Gothic', sans-serif;
        font-size: clamp(16px, 3vw, 24px);
        color: #F39C12;
        font-weight: 700;
      `;
      overlay.appendChild(trophyEl);
    }

    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 12px;
      pointer-events: auto;
    `;

    const retryBtn = this.createButton('🔄 もういちど', '#3498DB', '#2980B9');
    retryBtn.addEventListener('click', () => {
      this.sfx.play('buttonTap');
      if (this.mode === 'daily') {
        this.sceneManager.requestTransition('dailyPlay', { mode: 'daily' });
      } else {
        const target = this.mode === 'quiz' ? 'quizPlay' : 'setTimePlay';
        this.sceneManager.requestTransition(
          target as 'quizPlay' | 'setTimePlay',
          { mode: this.mode as 'quiz' | 'setTime', level: this.level },
        );
      }
    });

    const modeBtn = this.createButton('📋 モードせんたく', '#2ECC71', '#27AE60');
    modeBtn.addEventListener('click', () => {
      this.sfx.play('buttonTap');
      this.sceneManager.requestTransition('modeSelect');
    });

    const homeBtn = this.createButton('🏠 ホーム', '#E67E22', '#D35400');
    homeBtn.addEventListener('click', () => {
      this.sfx.play('buttonTap');
      this.sceneManager.requestTransition('title');
    });

    btnContainer.appendChild(retryBtn);

    if (ratio >= 0.6 && this.level < LEVELS.length && this.mode !== 'daily') {
      const nextBtn = this.createButton('つぎのレベルへ ➡️', '#9B59B6', '#8E44AD');
      nextBtn.addEventListener('click', () => {
        this.sfx.play('buttonTap');
        const target = this.mode === 'quiz' ? 'quizPlay' : 'setTimePlay';
        this.sceneManager.requestTransition(
          target as 'quizPlay' | 'setTimePlay',
          { mode: this.mode as 'quiz' | 'setTime', level: this.level + 1 },
        );
      });
      btnContainer.appendChild(nextBtn);
    }

    btnContainer.appendChild(modeBtn);
    btnContainer.appendChild(homeBtn);
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
      font-size: clamp(14px, 2.5vw, 20px);
      font-weight: 900;
      padding: 12px 24px;
      border: none;
      border-radius: 30px;
      background: linear-gradient(180deg, ${color1}, ${color2});
      color: #fff;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      transition: transform 0.1s;
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
