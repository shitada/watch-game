import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { LEVELS } from '@/game/config/LevelConfig';
import type { QuizResult } from '@/types';

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

function makeResults(correct: number, total: number): QuizResult[] {
  return Array.from({ length: total }, (_, i) => ({
    questionIndex: i,
    targetTime: { hours: 3, minutes: 0 },
    answerTime: { hours: 3, minutes: 0 },
    correct: i < correct,
  }));
}

describe('ResultScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let saveManager: SaveManager;
  let scene: ResultScene;

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

    scene = new ResultScene(sceneManager, audioManager, sfx, saveManager);
  });

  afterEach(() => {
    scene.exit();
    cleanupDOM();
  });

  function findNextLevelButton(): HTMLButtonElement | null {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.includes('つぎのレベルへ')) return btn;
    }
    return null;
  }

  describe('「つぎのレベルへ」ボタン表示条件', () => {
    it('レベルクリア（ratio >= 0.6）かつ次レベルが存在する quiz モードで表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });

      const btn = findNextLevelButton();
      expect(btn).not.toBeNull();
    });

    it('レベルクリア（ratio >= 0.6）かつ次レベルが存在する setTime モードで表示される', () => {
      scene.enter({ mode: 'setTime', level: 2, results: makeResults(4, 5) });

      const btn = findNextLevelButton();
      expect(btn).not.toBeNull();
    });

    it('レベル未クリア（ratio < 0.6）の場合、表示されない', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) });

      const btn = findNextLevelButton();
      expect(btn).toBeNull();
    });

    it('最終レベルの場合、表示されない', () => {
      scene.enter({ mode: 'quiz', level: LEVELS.length, results: makeResults(5, 5) });

      const btn = findNextLevelButton();
      expect(btn).toBeNull();
    });

    it('daily モードの場合、表示されない', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 5) });

      const btn = findNextLevelButton();
      expect(btn).toBeNull();
    });
  });

  describe('「つぎのレベルへ」ボタン遷移先', () => {
    it('quiz モードでクリック時に次レベルの quizPlay に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(4, 5) });

      const btn = findNextLevelButton()!;
      btn.click();

      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith('quizPlay', {
        mode: 'quiz',
        level: 3,
      });
    });

    it('setTime モードでクリック時に次レベルの setTimePlay に遷移する', () => {
      scene.enter({ mode: 'setTime', level: 1, results: makeResults(3, 5) });

      const btn = findNextLevelButton()!;
      btn.click();

      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith('setTimePlay', {
        mode: 'setTime',
        level: 2,
      });
    });
  });
});