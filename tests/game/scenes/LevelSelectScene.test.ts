import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelSelectScene } from '@/game/scenes/LevelSelectScene';
import { SaveManager } from '@/game/storage/SaveManager';
import type { SaveData } from '@/types';

// ── Mocks ──

function createMockSceneManager() {
  return { requestTransition: vi.fn() } as unknown as ConstructorParameters<typeof LevelSelectScene>[0];
}

function createMockAudioManager() {
  return { startBGM: vi.fn(), stopBGM: vi.fn() } as unknown as ConstructorParameters<typeof LevelSelectScene>[1];
}

function createMockSFX() {
  return { play: vi.fn() } as unknown as ConstructorParameters<typeof LevelSelectScene>[2];
}

function createSaveData(overrides: Partial<SaveData> = {}): SaveData {
  return {
    completedLevels: { quiz: [], setTime: [], daily: [] },
    trophies: [],
    totalCorrect: 0,
    totalPlays: 0,
    bestScores: {},
    ...overrides,
  };
}

function createMockSaveManager(data: SaveData) {
  const sm = new SaveManager();
  vi.spyOn(sm, 'load').mockReturnValue(data);
  return sm;
}

describe('LevelSelectScene — ベストスコア・トロフィー表示', () => {
  let uiOverlay: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    uiOverlay = document.createElement('div');
    uiOverlay.id = 'ui-overlay';
    document.body.appendChild(uiOverlay);
  });

  it('ベストスコアがある場合「🎯 3/5」のように表示される', () => {
    const saveData = createSaveData({
      bestScores: { 'quiz-1': 3 },
    });
    const scene = new LevelSelectScene(
      createMockSceneManager(),
      createMockAudioManager(),
      createMockSFX(),
      createMockSaveManager(saveData),
    );
    scene.enter({ mode: 'quiz' });

    const overlay = uiOverlay.firstElementChild!;
    const level1Card = overlay.querySelectorAll('button')[0];
    expect(level1Card.textContent).toContain('🎯 3/5');
  });

  it('ベストスコアがない（未プレイ）場合はスコア表示がない', () => {
    const saveData = createSaveData();
    const scene = new LevelSelectScene(
      createMockSceneManager(),
      createMockAudioManager(),
      createMockSFX(),
      createMockSaveManager(saveData),
    );
    scene.enter({ mode: 'quiz' });

    const overlay = uiOverlay.firstElementChild!;
    const level1Card = overlay.querySelectorAll('button')[0];
    expect(level1Card.textContent).not.toContain('🎯');
  });

  it('トロフィーがある場合「🏆」が表示される', () => {
    const saveData = createSaveData({
      trophies: ['quiz-2-perfect'],
      bestScores: { 'quiz-2': 5 },
    });
    const scene = new LevelSelectScene(
      createMockSceneManager(),
      createMockAudioManager(),
      createMockSFX(),
      createMockSaveManager(saveData),
    );
    scene.enter({ mode: 'quiz' });

    const overlay = uiOverlay.firstElementChild!;
    const level2Card = overlay.querySelectorAll('button')[1];
    expect(level2Card.textContent).toContain('🏆');
  });

  it('トロフィーがない場合「🏆」は表示されない', () => {
    const saveData = createSaveData({
      bestScores: { 'quiz-1': 3 },
    });
    const scene = new LevelSelectScene(
      createMockSceneManager(),
      createMockAudioManager(),
      createMockSFX(),
      createMockSaveManager(saveData),
    );
    scene.enter({ mode: 'quiz' });

    const overlay = uiOverlay.firstElementChild!;
    const level1Card = overlay.querySelectorAll('button')[0];
    expect(level1Card.textContent).not.toContain('🏆');
  });

  it('setTimeモードでも正しいキーでスコア・トロフィーを参照する', () => {
    const saveData = createSaveData({
      bestScores: { 'setTime-1': 4 },
      trophies: ['setTime-1-perfect'],
    });
    const scene = new LevelSelectScene(
      createMockSceneManager(),
      createMockAudioManager(),
      createMockSFX(),
      createMockSaveManager(saveData),
    );
    scene.enter({ mode: 'setTime' });

    const overlay = uiOverlay.firstElementChild!;
    const level1Card = overlay.querySelectorAll('button')[0];
    expect(level1Card.textContent).toContain('🎯 4/5');
    expect(level1Card.textContent).toContain('🏆');
  });
});