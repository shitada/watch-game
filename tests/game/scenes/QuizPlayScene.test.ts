import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizPlayScene } from '@/game/scenes/QuizPlayScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';

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

  const hud = document.createElement('div');
  hud.id = 'hud';
  document.body.appendChild(hud);
}

function cleanupDOM(): void {
  document.getElementById('ui-overlay')?.remove();
  document.getElementById('hud')?.remove();
  document.getElementById('notif-anim')?.remove();
}

describe('QuizPlayScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let scene: QuizPlayScene;

  beforeEach(() => {
    vi.useFakeTimers();
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

    scene = new QuizPlayScene(sceneManager, audioManager, sfx);
    scene.enter({ level: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupDOM();
  });

  it('exit() 後に setTimeout コールバックが requestTransition を呼ばないこと', () => {
    // Trigger an answer (select first choice)
    const buttons = document.querySelectorAll('button');
    const choiceButton = Array.from(buttons).find(b => b.textContent !== '🏠');
    choiceButton?.click();

    // exit before timers fire
    scene.exit();

    // Advance past both 1200ms and 1500ms timers
    vi.advanceTimersByTime(2000);

    // requestTransition should NOT have been called by the 1500ms timer
    // (it may have been called once during handleAnswer for notification, but not for transition)
    const transitionCalls = (sceneManager.requestTransition as ReturnType<typeof vi.fn>).mock.calls;
    const resultTransitions = transitionCalls.filter(
      (call: unknown[]) => call[0] === 'result',
    );
    expect(resultTransitions.length).toBe(0);
  });

  it('質問プロンプト「なんじかな」が表示されること', () => {
    const uiOverlay = document.getElementById('ui-overlay')!;
    const allText = uiOverlay.textContent ?? '';
    expect(allText).toContain('なんじかな');
  });

  it('enter() で pendingTimers が初期化されること（再入時の防御）', () => {
    // Trigger an answer
    const buttons = document.querySelectorAll('button');
    const choiceButton = Array.from(buttons).find(b => b.textContent !== '🏠');
    choiceButton?.click();

    // exit and re-enter
    scene.exit();
    setupDOM();
    scene.enter({ level: 1 });

    // Advance timers - old timers should have been cleared by exit()
    vi.advanceTimersByTime(2000);

    const transitionCalls = (sceneManager.requestTransition as ReturnType<typeof vi.fn>).mock.calls;
    const resultTransitions = transitionCalls.filter(
      (call: unknown[]) => call[0] === 'result',
    );
    expect(resultTransitions.length).toBe(0);
  });
});
