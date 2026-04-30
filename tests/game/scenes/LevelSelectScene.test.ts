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
  });

  afterEach(() => {
    scene.exit();
    cleanupDOM();
    localStorage.clear();
  });

  function getCards(): HTMLButtonElement[] {
    const overlay = document.getElementById('ui-overlay')!;
    return Array.from(overlay.querySelectorAll('button')).filter(
      (btn) => btn.textContent !== '← もどる',
    ) as HTMLButtonElement[];
  }

  describe('ベストスコア表示', () => {
    it('ベストスコアが存在するレベルで「ベスト: X/Y」が表示される', () => {
      saveManager.updateBestScore('quiz-1', 4);
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).toContain('ベスト: 4/5');
    });

    it('ベストスコアが存在しないレベルでベスト表示がない', () => {
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).not.toContain('ベスト:');
    });

    it('setTimeモードでベストスコアが正しく取得される', () => {
      saveManager.updateBestScore('setTime-2', 3);
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'setTime' });

      const cards = getCards();
      // レベル2のカード（index 1）にベストスコアが表示される
      expect(cards[1].textContent).toContain('ベスト: 3/5');
      // レベル1のカード（index 0）にはベストスコアが表示されない
      expect(cards[0].textContent).not.toContain('ベスト:');
    });
  });

  describe('パフォーマンス星評価', () => {
    it('100%正解で★★★が表示される', () => {
      const qCount = LEVELS[0].questionCount; // 5
      saveManager.updateBestScore('quiz-1', qCount);
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).toContain('★★★');
    });

    it('80%以上で★★☆が表示される', () => {
      // レベル1: questionCount=5, 80%=4
      saveManager.updateBestScore('quiz-1', 4);
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).toContain('★★☆');
    });

    it('60%以上で★☆☆が表示される', () => {
      // レベル1: questionCount=5, 60%=3
      saveManager.updateBestScore('quiz-1', 3);
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).toContain('★☆☆');
    });

    it('60%未満で☆☆☆が表示される', () => {
      // レベル1: questionCount=5, 40%=2
      saveManager.updateBestScore('quiz-1', 2);
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).toContain('☆☆☆');
    });

    it('ベストスコアが未設定のレベルでは☆☆☆が表示される', () => {
      scene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz' });

      const cards = getCards();
      expect(cards[0].textContent).toContain('☆☆☆');
    });
  });
});
