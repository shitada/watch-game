import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import type { QuizResult, ClockTime } from '@/types';

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

function makeResults(total: number, correct: number): QuizResult[] {
  const time: ClockTime = { hours: 3, minutes: 0 };
  return Array.from({ length: total }, (_, i) => ({
    questionIndex: i,
    targetTime: time,
    answerTime: time,
    correct: i < correct,
  }));
}

describe('ResultScene - トロフィー獲得通知', () => {
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
    localStorage.clear();
  });

  it('パーフェクト達成 + 初回トロフィー → 🏆 トロフィーゲット！が表示される', () => {
    const results = makeResults(5, 5); // 5/5 = 100%
    scene.enter({ mode: 'quiz', level: 1, results });

    const uiOverlay = document.getElementById('ui-overlay')!;
    const trophyMsg = Array.from(uiOverlay.querySelectorAll('div')).find(
      el => el.textContent?.includes('トロフィーゲット'),
    );
    expect(trophyMsg).toBeDefined();
    expect(trophyMsg!.textContent).toContain('🏆');
  });

  it('パーフェクト達成 + 既得トロフィー → トロフィーゲット！が表示されない', () => {
    // 事前にトロフィーを付与
    saveManager.addTrophy('quiz-1-perfect');

    const results = makeResults(5, 5);
    scene.enter({ mode: 'quiz', level: 1, results });

    const uiOverlay = document.getElementById('ui-overlay')!;
    const trophyMsg = Array.from(uiOverlay.querySelectorAll('div')).find(
      el => el.textContent?.includes('トロフィーゲット'),
    );
    expect(trophyMsg).toBeUndefined();
  });

  it('パーフェクト未達 → トロフィーゲット！が表示されない', () => {
    const results = makeResults(5, 4); // 4/5 = 80%
    scene.enter({ mode: 'quiz', level: 1, results });

    const uiOverlay = document.getElementById('ui-overlay')!;
    const trophyMsg = Array.from(uiOverlay.querySelectorAll('div')).find(
      el => el.textContent?.includes('トロフィーゲット'),
    );
    expect(trophyMsg).toBeUndefined();
  });

  it('exit() で isNewTrophy がリセットされること', () => {
    const results = makeResults(5, 5);
    scene.enter({ mode: 'quiz', level: 1, results });
    scene.exit();

    // 再度 enter（レベル2、初回トロフィー）→ 表示される
    setupDOM();
    const results2 = makeResults(5, 5);
    scene.enter({ mode: 'quiz', level: 2, results: results2 });

    const uiOverlay = document.getElementById('ui-overlay')!;
    const trophyMsg = Array.from(uiOverlay.querySelectorAll('div')).find(
      el => el.textContent?.includes('トロフィーゲット'),
    );
    expect(trophyMsg).toBeDefined();
  });
});
