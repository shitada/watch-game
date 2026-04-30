import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { QuizResult } from '@/types';

// Mock FireworkEffect before importing ResultScene
vi.mock('@/game/effects/FireworkEffect', () => {
  class MockFireworkEffect {
    trigger = vi.fn();
    update = vi.fn();
    dispose = vi.fn();
    isActive = vi.fn().mockReturnValue(false);
  }
  return { FireworkEffect: MockFireworkEffect };
});

import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';

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
  const results: QuizResult[] = [];
  for (let i = 0; i < total; i++) {
    results.push({
      questionIndex: i,
      targetTime: { hours: 3, minutes: 0 },
      answerTime: { hours: 3, minutes: 0 },
      correct: i < correct,
    });
  }
  return results;
}

describe('ResultScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let saveManager: SaveManager;
  let scene: ResultScene;

  beforeEach(() => {
    localStorage.clear();
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
    vi.spyOn(saveManager, 'addCompletedLevel');
    vi.spyOn(saveManager, 'addTrophy');
    vi.spyOn(saveManager, 'updateBestScore');
    vi.spyOn(saveManager, 'incrementStats');

    scene = new ResultScene(sceneManager, audioManager, sfx, saveManager);
  });

  afterEach(() => {
    scene?.exit();
    cleanupDOM();
    vi.restoreAllMocks();
  });

  // 1. 正解率 100% (5/5)
  it('正解率100%: addCompletedLevel, addTrophy, updateBestScore, incrementStats が呼ばれる', () => {
    scene.enter({ mode: 'quiz', level: 2, results: makeResults(5, 5) });

    expect(saveManager.addCompletedLevel).toHaveBeenCalledWith('quiz', 2);
    expect(saveManager.addTrophy).toHaveBeenCalledWith('quiz-2-perfect');
    expect(saveManager.updateBestScore).toHaveBeenCalledWith('quiz-2', 5);
    expect(saveManager.incrementStats).toHaveBeenCalledWith(5);
  });

  // 2. 正解率 60% (3/5)
  it('正解率60%: addCompletedLevel が呼ばれ、addTrophy は呼ばれない', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });

    expect(saveManager.addCompletedLevel).toHaveBeenCalledWith('quiz', 1);
    expect(saveManager.addTrophy).not.toHaveBeenCalled();
  });

  // 3. 正解率 40% (2/5)
  it('正解率40%: addCompletedLevel も addTrophy も呼ばれない', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) });

    expect(saveManager.addCompletedLevel).not.toHaveBeenCalled();
    expect(saveManager.addTrophy).not.toHaveBeenCalled();
  });

  // 4. daily モード
  it('dailyモード: ratio>=0.6 で addCompletedLevel("daily", 1) が呼ばれる', () => {
    scene.enter({ mode: 'daily', level: 1, results: makeResults(4, 5) });

    // daily モードでは mode !== 'daily' の分岐は通らず、daily 分岐のみ
    expect(saveManager.addCompletedLevel).toHaveBeenCalledWith('daily', 1);
  });

  // 5. 星表示
  describe('星表示', () => {
    it.each([
      { correct: 5, total: 5, expected: '★★★' },
      { correct: 4, total: 5, expected: '★★☆' },
      { correct: 3, total: 5, expected: '★☆☆' },
      { correct: 1, total: 5, expected: '☆☆☆' },
    ])('$correct/$total → $expected', ({ correct, total, expected }) => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(correct, total) });

      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain(expected);
    });
  });

  // 6. メッセージ表示
  describe('メッセージ表示', () => {
    it.each([
      { correct: 5, total: 5, expected: '🎉 パーフェクト！すごい！' },
      { correct: 4, total: 5, expected: '👏 とてもよくできました！' },
      { correct: 3, total: 5, expected: '😊 よくがんばったね！' },
      { correct: 1, total: 5, expected: '💪 もういちど チャレンジしよう！' },
    ])('$correct/$total → メッセージが正しい', ({ correct, total, expected }) => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(correct, total) });

      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain(expected);
    });
  });

  // 7. SFX テスト
  it('正解率100%で allClear SFX が再生される', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
    expect(sfx.play).toHaveBeenCalledWith('allClear');
  });

  it('正解率60%以上100%未満で levelClear SFX が再生される', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
    expect(sfx.play).toHaveBeenCalledWith('levelClear');
  });

  it('正解率60%未満で allClear も levelClear も再生されない', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) });
    expect(sfx.play).not.toHaveBeenCalledWith('allClear');
    expect(sfx.play).not.toHaveBeenCalledWith('levelClear');
  });

  // 8. exit() テスト
  it('exit() でオーバーレイが削除され BGM が停止する', () => {
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });

    const overlay = document.getElementById('ui-overlay')!;
    expect(overlay.children.length).toBeGreaterThan(0);

    scene.exit();

    expect(overlay.children.length).toBe(0);
    expect(audioManager.stopBGM).toHaveBeenCalled();
  });

  // 9. 空の results
  it('空の results で ratio=0 として安全に処理される', () => {
    scene.enter({ mode: 'quiz', level: 1, results: [] });

    expect(saveManager.addCompletedLevel).not.toHaveBeenCalled();
    expect(saveManager.addTrophy).not.toHaveBeenCalled();
    expect(saveManager.updateBestScore).toHaveBeenCalledWith('quiz-1', 0);
    expect(saveManager.incrementStats).toHaveBeenCalledWith(0);

    const overlay = document.getElementById('ui-overlay')!;
    expect(overlay.textContent).toContain('☆☆☆');
    expect(overlay.textContent).toContain('💪 もういちど チャレンジしよう！');
  });
});
