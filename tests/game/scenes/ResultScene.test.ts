import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { LEVELS } from '@/game/config/LevelConfig';
import type { QuizResult, ClockTime } from '@/types';

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

function makeResults(total: number, correct: number): QuizResult[] {
  const time: ClockTime = { hours: 3, minutes: 0 };
  return Array.from({ length: total }, (_, i) => ({
    questionIndex: i,
    targetTime: time,
    answerTime: time,
    correct: i < correct,
  }));
}

function findButtonByText(text: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  return Array.from(buttons).find(b => b.textContent?.includes(text));
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
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(5, 3) }); // 60%
      const data = saveManager.load();
      expect(data.completedLevels.quiz).toContain(2);
    });

    it('ratio >= 0.6 かつ setTime モードで completedLevel が保存される', () => {
      scene.enter({ mode: 'setTime', level: 3, results: makeResults(5, 4) }); // 80%
      const data = saveManager.load();
      expect(data.completedLevels.setTime).toContain(3);
    });

    it('ratio < 0.6 かつ quiz モードで completedLevel が保存されない', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 2) }); // 40%
      const data = saveManager.load();
      expect(data.completedLevels.quiz).not.toContain(1);
    });

    it('ratio >= 0.6 かつ daily モードで daily の completedLevel が保存される', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 3) }); // 60%
      const data = saveManager.load();
      expect(data.completedLevels.daily).toContain(1);
    });

    it('ratio < 0.6 かつ daily モードで completedLevel が保存されない', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 2) }); // 40%
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
    it('ratio 100% で bestScore と stats が更新される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
      const data = saveManager.load();
      expect(data.bestScores['quiz-1']).toBe(5);
      expect(data.totalCorrect).toBe(5);
      expect(data.totalPlays).toBe(1);
    });

    it('ratio 40% でも bestScore と stats が更新される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 2) }); // 40%
      const data = saveManager.load();
      expect(data.bestScores['quiz-1']).toBe(2);
      expect(data.totalCorrect).toBe(2);
      expect(data.totalPlays).toBe(1);
    });

    it('複数回プレイで totalPlays が加算される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      scene.exit();
      cleanupDOM();
      setupDOM();
      scene = new ResultScene(sceneManager, audioManager, sfx, saveManager);
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 4) });
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
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 4) }); // 80%
      const data = saveManager.load();
      expect(data.trophies).toHaveLength(0);
    });
  });

  // ── BGM / SFX ──

  describe('BGM と SFX', () => {
    it('enter() で result BGM が開始される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      expect(audioManager.startBGM).toHaveBeenCalledWith('result');
    });

    it('ratio === 1 で allClear SFX が再生される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
      expect(sfx.play).toHaveBeenCalledWith('allClear');
    });

    it('ratio >= 0.6 かつ < 1 で levelClear SFX が再生される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 4) }); // 80%
      expect(sfx.play).toHaveBeenCalledWith('levelClear');
    });

    it('ratio < 0.6 では SFX が再生されない', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 2) }); // 40%
      expect(sfx.play).not.toHaveBeenCalled();
    });

    it('exit() で BGM が停止される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
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
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 4) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('★★☆');
      expect(overlay.textContent).toContain('とてもよくできました');
    });

    it('60% で星1つ ★☆☆ と「よくがんばったね」が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('★☆☆');
      expect(overlay.textContent).toContain('よくがんばったね');
    });

    it('40% で星0個 ☆☆☆ と「もういちど チャレンジしよう」が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 2) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('☆☆☆');
      expect(overlay.textContent).toContain('もういちど チャレンジしよう');
    });

    it('スコア表示が「correct / total もん せいかい！」形式である', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      const overlay = document.getElementById('ui-overlay')!;
      expect(overlay.textContent).toContain('3 / 5 もん せいかい！');
    });
  });

  // ── ボタン遷移 ──

  describe('ボタン遷移', () => {
    it('ratio < 0.6 で 3つのボタン（もういちど・モードせんたく・ホーム）が表示される', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 2) }); // 40%
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBe(3);
      const texts = Array.from(buttons).map(b => b.textContent);
      expect(texts.some(t => t?.includes('もういちど'))).toBe(true);
      expect(texts.some(t => t?.includes('モードせんたく'))).toBe(true);
      expect(texts.some(t => t?.includes('ホーム'))).toBe(true);
    });

    it('ホームボタンで title に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      const homeBtn = findButtonByText('ホーム')!;
      homeBtn.click();
      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith('title');
    });

    it('モードせんたくボタンで modeSelect に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      const modeBtn = findButtonByText('モードせんたく')!;
      modeBtn.click();
      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
      expect(sceneManager.requestTransition).toHaveBeenCalledWith('modeSelect');
    });

    it('もういちどボタンで quiz モードは quizPlay に遷移する', () => {
      scene.enter({ mode: 'quiz', level: 2, results: makeResults(5, 3) });
      const retryBtn = findButtonByText('もういちど')!;
      retryBtn.click();
      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'quizPlay',
        { mode: 'quiz', level: 2 },
      );
    });

    it('もういちどボタンで setTime モードは setTimePlay に遷移する', () => {
      scene.enter({ mode: 'setTime', level: 3, results: makeResults(5, 3) });
      const retryBtn = findButtonByText('もういちど')!;
      retryBtn.click();
      expect(sceneManager.requestTransition).toHaveBeenCalledWith(
        'setTimePlay',
        { mode: 'setTime', level: 3 },
      );
    });

    it('もういちどボタンで daily モードは dailyPlay に遷移する', () => {
      scene.enter({ mode: 'daily', level: 1, results: makeResults(5, 3) });
      const retryBtn = findButtonByText('もういちど')!;
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
      scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.children.length).toBe(1);
      scene.exit();
      expect(uiOverlay.children.length).toBe(0);
    });
  });
});

describe('ResultScene — つぎのレベルへボタン', () => {
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

  it('レベルクリア（ratio >= 0.6）かつ最終レベルでない場合にボタンが表示される', () => {
    // 3/5 = 0.6 — ちょうど境界値
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeDefined();
  });

  it('ratio = 0.6 ちょうどでボタンが表示される（境界値）', () => {
    scene.enter({ mode: 'quiz', level: 2, results: makeResults(5, 3) });

    const btn = findButtonByText('つぎのレベルへ');
    expect(btn).toBeDefined();
  });

  it('ratio = 0.59 でボタンが表示されない（境界値）', () => {
    // 2/5 = 0.4 < 0.6
    scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 2) });

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
    scene.enter({ mode: 'quiz', level: 2, results: makeResults(5, 4) });

    const btn = findButtonByText('つぎのレベルへ');
    btn!.click();

    expect(sfx.play).toHaveBeenCalledWith('buttonTap');
    expect(sceneManager.requestTransition).toHaveBeenCalledWith(
      'quizPlay',
      { mode: 'quiz', level: 3 },
    );
  });

  it('setTime モードでボタンクリック時に setTimePlay に level+1 で遷移する', () => {
    scene.enter({ mode: 'setTime', level: 1, results: makeResults(5, 3) });

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
