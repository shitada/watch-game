import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScene } from '@/game/scenes/ResultScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import type { QuizResult } from '@/types';

vi.mock('@/game/effects/FireworkEffect', () => {
  return {
    FireworkEffect: class {
      trigger = vi.fn();
      update = vi.fn();
      dispose = vi.fn();
      isActive = vi.fn(() => false);
    },
  };
});

function setupDOM(): void {
  const uiOverlay = document.createElement('div');
  uiOverlay.id = 'ui-overlay';
  document.body.appendChild(uiOverlay);
}

function cleanupDOM(): void {
  document.getElementById('ui-overlay')?.remove();
}

function makeResults(total: number, correct: number): QuizResult[] {
  const time = { hours: 3, minutes: 0 };
  return Array.from({ length: total }, (_, i) => ({
    questionIndex: i,
    targetTime: time,
    answerTime: time,
    correct: i < correct,
  }));
}

describe('ResultScene continuous rendering', () => {
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

  it('firework triggered on perfect -> needsContinuousRendering() true when effect is active', () => {
    const fe = (scene as any).fireworkEffect as any;

    scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 5) });
    // trigger should have been called
    expect(fe.trigger).toHaveBeenCalled();

    // simulate active effect
    fe.isActive = vi.fn(() => true);
    expect(scene.needsContinuousRendering()).toBe(true);
  });

  it('normal result -> needsContinuousRendering() is false', () => {
    const fe = (scene as any).fireworkEffect as any;

    scene.enter({ mode: 'quiz', level: 1, results: makeResults(5, 3) });
    // trigger should not have been called
    expect(fe.trigger).not.toHaveBeenCalled();

    // default mock returns false
    expect(scene.needsContinuousRendering()).toBe(false);
  });
});
