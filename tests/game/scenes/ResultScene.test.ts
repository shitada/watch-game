import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
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

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = container.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.includes(text)) return btn;
  }
  return null;
}

describe('ResultScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let saveManager: SaveManager;
  let scene: ResultScene;

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

    saveManager = {
      addCompletedLevel: vi.fn(),
      updateBestScore: vi.fn(),
      incrementStats: vi.fn(),
      addTrophy: vi.fn(),
    } as unknown as SaveManager;

    scene = new ResultScene(sceneManager, audioManager, sfx, saveManager);
  });

  afterEach(() => {
    scene.exit();
    cleanupDOM();
  });

  describe('つぎのレベルへボタン', () => {
    it('クリア時（ratio >= 0.6, level < 4）にボタンが表示される', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(4, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ');
      expect(nextBtn).not.toBeNull();
    });

    it('未クリア時（ratio < 0.6）にボタンが表示されない', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(2, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ');
      expect(nextBtn).toBeNull();
    });

    it('最終レベル（level = 4）にボタンが表示されない', () => {
      scene.enter({ mode: 'quiz', level: 4, results: makeResults(5, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ');
      expect(nextBtn).toBeNull();
    });

    it('daily モードではボタンが表示されない', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ');
      expect(nextBtn).toBeNull();
    });

    it('setTime モードでもクリア時にボタンが表示される', () => {
      scene.enter({ mode: 'setTime', level: 1, results: makeResults(3, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ');
      expect(nextBtn).not.toBeNull();
    });

    it('クリック時に同モードの level + 1 に遷移する（quiz）', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(4, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ')!;
      nextBtn.click();

      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'quizPlay',
        { mode: 'quiz', level: 3 },
      );
    });

    it('クリック時に同モードの level + 1 に遷移する（setTime）', () => {
      scene.enter({ mode: 'setTime', level: 1, results: makeResults(3, 5) });

      const overlay = document.getElementById('ui-overlay')!;
      const nextBtn = findButtonByText(overlay, 'つぎのレベルへ')!;
      nextBtn.click();

      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'setTimePlay',
        { mode: 'setTime', level: 2 },
      );
    });
  });
});
