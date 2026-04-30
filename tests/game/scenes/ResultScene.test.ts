import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import type { QuizResult } from '@/types';

// Mock FireworkEffect at module level [S-1]
vi.mock('@/game/effects/FireworkEffect', () => {
  return {
    FireworkEffect: class {
      trigger = vi.fn();
      update = vi.fn();
      dispose = vi.fn();
    },
  };
});

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
    scene?.exit();
    cleanupDOM();
  });

  // ── セーブロジック ──

  describe('進捗保存', () => {
    it('ratio >= 0.6 かつ quiz モードで completedLevel が保存される', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(3, 5) }); // 60%
      const data = saveManager.load();
      expect(data.completedLevels.quiz).toContain(2);
    });

    it('ratio >= 0.6 かつ setTime モードで completedLevel が保存される', () => {
      scene.enter({ mode: 'setTime', level: 3, results: makeResults(4, 5) }); // 80%
      const data = saveManager.load();
      expect(data.completedLevels.setTime).toContain(3);
    });

    it('ratio < 0.6 かつ quiz モードで completedLevel が保存されない', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) }); // 40%
      const data = saveManager.load();
      expect(data.completedLevels.quiz).not.toContain(1);
    });

    it('ratio >= 0.6 かつ daily モードで daily の completedLevel が保存される', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(3, 5) }); // 60%
      const data = saveManager.load();
      expect(data.completedLevels.daily).toContain(1);
    });

    // [S-2] daily モードで ratio < 0.6 の場合
    it('ratio < 0.6 かつ daily モードで completedLevel が保存されない', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(2, 5) }); // 40%
      const data = saveManager.load();
      expect(data.completedLevels.daily).not.toContain(1);
    });

    it('daily モードでは quiz/setTime の completedLevel には追加されない', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 5) }); // 100%
      const data = saveManager.load();
      expect(data.completedLevels.quiz).toHaveLength(0);
      expect(data.completedLevels.setTime).toHaveLength(0);
    });
  });

  describe('ベストスコアと統計', () => {
    // [W-1] bestScore と incrementStats は ratio に関係なく常に呼ばれる
    it('ratio 100% で bestScore と stats が更新される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
      const data = saveManager.load();
      expect(data.bestScores['quiz-1']).toBe(5);
      expect(data.totalCorrect).toBe(5);
      expect(data.totalPlays).toBe(1);
    });

    it('ratio 40% でも bestScore と stats が更新される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) }); // 40%
      const data = saveManager.load();
      expect(data.bestScores['quiz-1']).toBe(2);
      expect(data.totalCorrect).toBe(2);
      expect(data.totalPlays).toBe(1);
    });

    it('複数回プレイで totalPlays が加算される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      scene.exit();
      cleanupDOM();
      setupDOM();
      scene = new ResultScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(4, 5) });
      const data = saveManager.load();
      expect(data.totalPlays).toBe(2);
      expect(data.totalCorrect).toBe(7);
      expect(data.bestScores['quiz-1']).toBe(4);
    });
  });

  describe('トロフィー', () => {
    it('ratio === 1 でパーフェクトトロフィーが付与される', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(5, 5) });
      const data = saveManager.load();
      expect(data.trophies).toContain('quiz-2-perfect');
    });

    it('ratio < 1 ではトロフィーが付与されない', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(4, 5) }); // 80%
      const data = saveManager.load();
      expect(data.trophies).toHaveLength(0);
    });
  });

  // ── BGM / SFX ──

  describe('BGM と SFX', () => {
    it('enter() で result BGM が開始される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      expect(audioManager.startBGM).toHaveBeenCalledWith('result');
    });

    it('ratio === 1 で allClear SFX が再生される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
      expect(sfx.play).toHaveBeenCalledWith('allClear');
    });

    it('ratio >= 0.6 かつ < 1 で levelClear SFX が再生される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(4, 5) }); // 80%
      expect(sfx.play).toHaveBeenCalledWith('levelClear');
    });

    it('ratio < 0.6 では SFX が再生されない', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) }); // 40%
      expect(sfx.play).not.toHaveBeenCalled();
    });

    it('exit() で BGM が停止される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      scene.exit();
      expect(audioManager.stopBGM).toHaveBeenCalled();
    });
  });

  // ── UI 表示 ──

  describe('UI 表示', () => {
    it('100% で星3つ ★★★ とパーフェクトメッセージが表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('★★★');
      expect(overlay.textContent).toContain('パーフェクト');
    });

    it('80% で星2つ ★★☆ と「とてもよくできました」が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(4, 5) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('★★☆');
      expect(overlay.textContent).toContain('とてもよくできました');
    });

    it('60% で星1つ ★☆☆ と「よくがんばったね」が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('★☆☆');
      expect(overlay.textContent).toContain('よくがんばったね');
    });

    it('40% で星0個 ☆☆☆ と「もういちど チャレンジしよう」が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(2, 5) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('☆☆☆');
      expect(overlay.textContent).toContain('もういちど チャレンジしよう');
    });

    it('スコア表示が「correct / total もん せいかい！」形式である', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('3 / 5 もん せいかい！');
    });
  });

  // ── ボタン遷移 ──

  describe('ボタン遷移', () => {
    // [W-2] 3つのボタンが存在すること
    it('3つのボタン（もういちど・モードせんたく・ホーム）が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBe(3);
      const texts = Array.from(buttons).map(b => b.textContent);
      expect(texts).toContain('🔄 もういちど');
      expect(texts).toContain('📋 モードせんたく');
      expect(texts).toContain('🏠 ホーム');
    });

    it('ホームボタンで title に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      const homeBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('ホーム'))!;
      homeBtn.click();
      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith('title');
    });

    // [W-2] モードせんたくボタン
    it('モードせんたくボタンで modeSelect に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      const modeBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('モードせんたく'))!;
      modeBtn.click();
      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith('modeSelect');
    });

    // [W-3] もういちどボタン — quiz モード
    it('もういちどボタンで quiz モードは quizPlay に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(3, 5) });
      const retryBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('もういちど'))!;
      retryBtn.click();
      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'quizPlay',
        { mode: 'quiz', level: 2 },
      );
    });

    // [W-3] もういちどボタン — setTime モード
    it('もういちどボタンで setTime モードは setTimePlay に遷移する', () => {
      scene.enter({ mode: 'setTime', level: 3, results: makeResults(3, 5) });
      const retryBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('もういちど'))!;
      retryBtn.click();
      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'setTimePlay',
        { mode: 'setTime', level: 3 },
      );
    });

    // [W-3] もういちどボタン — daily モード
    it('もういちどボタンで daily モードは dailyPlay に遷移する', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(3, 5) });
      const retryBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('もういちど'))!;
      retryBtn.click();
      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'dailyPlay',
        { mode: 'daily' },
      );
    });
  });

  // ── exit() ──

  describe('exit()', () => {
    it('exit() でオーバーレイが除去される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(3, 5) });
      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.children.length).toBe(1);
      scene.exit();
      expect(uiOverlay.children.length).toBe(0);
    });
  });
});
