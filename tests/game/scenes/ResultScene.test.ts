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

function findButtonByText(text: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  return Array.from(buttons).find(b => b.textContent?.includes(text));
}

describe('ResultScene — つぎのレベルへボタン', () => {
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

  it('レベルクリア（ratio >= 0.6）かつ最終レベルでない場合にボタンが表示される', () => {
    // 3/5 = 0.6 — ちょうど境界値
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeDefined();
  });

  it('ratio = 0.6 ちょうどでボタンが表示される（境界値）', () => {
    scene.enter({ mode: 'quiz', level: 2, results: makeResults(3, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeDefined();
  });

  it('ratio = 0.59 でボタンが表示されない（境界値）', () => {
    // 2/5 = 0.4 < 0.6
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeUndefined();
  });

  it('最終レベルの場合はボタンが表示されない', () => {
    const maxLevel = LEVELS.length;
    scene.enter({ mode: 'quiz', level: maxLevel, results: makeResults(5, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeUndefined();
  });

  it('mode === "daily" の場合はボタンが表示されない', () => {
    scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeUndefined();
  });

  it('quiz モードでボタンクリック時に quizPlay に level+1 で遷移する', () => {
    scene.enter({ mode: 'quiz', level: 2, results: makeResults(4, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    btn!.click();

    expect(sfx.play).toHaveBeenCalledWith('buttonTap');
    expect(sceneManager.requestTransition).toHaveBeenCalledWith(
      'quizPlay',
      { mode: 'quiz', level: 3 },
    );
  });

  it('setTime モードでボタンクリック時に setTimePlay に level+1 で遷移する', () => {
    scene.enter({ mode: 'setTime', level: 1, results: makeResults(3, 5) });

    const btn = findButtonByText('つぎのレベルへ');
    btn!.click();

    expect(sfx.play).toHaveBeenCalledWith('buttonTap');
    expect(sceneManager.requestTransition).toHaveBeenCalledWith(
      'setTimePlay',
      { mode: 'setTime', level: 2 },
    );
  });

  it('retryBtn の直後に配置される', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });

    const buttons = document.querySelectorAll('button');
    const texts = Array.from(buttons).map(b => b.textContent);

    const retryIdx = texts.findIndex(t => t?.includes('もういちど'));
    const nextIdx = texts.findIndex(t => t?.includes('つぎのレベルへ'));

    expect(nextIdx).toBe(retryIdx + 1);
  });
});
