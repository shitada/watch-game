import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LevelSelectScene } from '@/game/scenes/LevelSelectScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { LEVELS } from '@/game/config/LevelConfig';

// Mock Canvas 2D context
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  canvas: { width: 300, height: 150 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

function setupDOM(): void {
  const uiOverlay = document.createElement('div');
  uiOverlay.id = 'ui-overlay';
  document.body.appendChild(uiOverlay);
}

function cleanupDOM(): void {
  document.getElementById('ui-overlay')?.remove();
}

describe('LevelSelectScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let saveManager: SaveManager;
  let scene: LevelSelectScene;

  beforeEach(() => {
    setupDOM();
    localStorage.clear();

    sceneManager = new SceneManager();
    sceneManager.requestTransition = vi.fn();

    audioManager = {
      startBGM: vi.fn(),
      stopBGM: vi.fn(),
    } as unknown as AudioManager;

    sfx = {
      play: vi.fn(),
    } as unknown as SFXGenerator;

    saveManager = new SaveManager();
    scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
  });

  afterEach(() => {
    scene.exit();
    cleanupDOM();
    localStorage.clear();
  });

  describe('星評価表示（ベストスコアベース）', () => {
    it('未プレイのレベルは ☆☆☆ を表示する', () => {
      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starElements = uiOverlay.querySelectorAll('div');
      // 各レベルカード内の星テキストを収集
      const starTexts = Array.from(starElements)
        .map(el => el.textContent)
        .filter(text => text && /^[★☆]+$/.test(text));

      expect(starTexts.length).toBe(LEVELS.length);
      starTexts.forEach(text => {
        expect(text).toBe('☆☆☆');
      });
    });

    it('ratio < 0.6 のとき ☆☆☆ を表示する', () => {
      // レベル1: questionCount=5, bestScore=2 → ratio=0.4
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 2;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && /^[★☆]+$/.test(text));

      expect(starTexts[0]).toBe('☆☆☆');
    });

    it('ratio >= 0.6 のとき ★☆☆ を表示する', () => {
      // レベル1: questionCount=5, bestScore=3 → ratio=0.6
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 3;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && /^[★☆]+$/.test(text));

      expect(starTexts[0]).toBe('★☆☆');
    });

    it('ratio >= 0.8 のとき ★★☆ を表示する', () => {
      // レベル1: questionCount=5, bestScore=4 → ratio=0.8
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 4;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && /^[★☆]+$/.test(text));

      expect(starTexts[0]).toBe('★★☆');
    });

    it('ratio === 1.0 のとき ★★★ を表示する', () => {
      // レベル1: questionCount=5, bestScore=5 → ratio=1.0
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 5;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && /^[★☆]+$/.test(text));

      expect(starTexts[0]).toBe('★★★');
    });

    it('未プレイ（☆☆☆）はグレー(#BDC3C7)で表示される', () => {
      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starElements = Array.from(uiOverlay.querySelectorAll('div'))
        .filter(el => el.textContent && /^[★☆]+$/.test(el.textContent));

      starElements.forEach(el => {
        expect(el.style.color).toBe('rgb(189, 195, 199)');
      });
    });

    it('★ありはゴールド(#F39C12)で表示される', () => {
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 5; // ★★★
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starElements = Array.from(uiOverlay.querySelectorAll('div'))
        .filter(el => el.textContent && /^[★☆]+$/.test(el.textContent));

      // レベル1は★ありなのでゴールド
      expect(starElements[0].style.color).toBe('rgb(243, 156, 18)');
    });

    it('setTime モードでも正しいキーでスコアを参照する', () => {
      const data = saveManager.load();
      data.bestScores['setTime-1'] = 5; // ★★★
      saveManager.save(data);

      scene.enter({ mode: 'setTime' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const starTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && /^[★☆]+$/.test(text));

      expect(starTexts[0]).toBe('★★★');
    });
  });

  describe('ベストスコア・トロフィー表示', () => {
    it('ベストスコアがある場合「🎯 3/5」のように表示される', () => {
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 3;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const overlay = uiOverlay.firstElementChild!;
      const level1Card = overlay.querySelectorAll('button')[0];
      expect(level1Card.textContent).toContain('🎯 3/5');
    });

    it('ベストスコアがない（未プレイ）場合はスコア表示がない', () => {
      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const overlay = uiOverlay.firstElementChild!;
      const level1Card = overlay.querySelectorAll('button')[0];
      expect(level1Card.textContent).not.toContain('🎯');
    });

    it('トロフィーがある場合「🏆」が表示される', () => {
      const data = saveManager.load();
      data.trophies = ['quiz-2-perfect'];
      data.bestScores['quiz-2'] = 5;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const overlay = uiOverlay.firstElementChild!;
      const level2Card = overlay.querySelectorAll('button')[1];
      expect(level2Card.textContent).toContain('🏆');
    });

    it('トロフィーがない場合「🏆」は表示されない', () => {
      const data = saveManager.load();
      data.bestScores['quiz-1'] = 3;
      saveManager.save(data);

      scene.enter({ mode: 'quiz' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const overlay = uiOverlay.firstElementChild!;
      const level1Card = overlay.querySelectorAll('button')[0];
      expect(level1Card.textContent).not.toContain('🏆');
    });

    it('setTimeモードでも正しいキーでスコア・トロフィーを参照する', () => {
      const data = saveManager.load();
      data.bestScores['setTime-1'] = 4;
      data.trophies = ['setTime-1-perfect'];
      saveManager.save(data);

      scene.enter({ mode: 'setTime' });

      const uiOverlay = document.getElementById('ui-overlay')!;
      const overlay = uiOverlay.firstElementChild!;
      const level1Card = overlay.querySelectorAll('button')[0];
      expect(level1Card.textContent).toContain('🎯 4/5');
      expect(level1Card.textContent).toContain('🏆');
    });
  });
});
