import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SetTimePlayScene } from '@/game/scenes/SetTimePlayScene';
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

describe('SetTimePlayScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let scene: SetTimePlayScene;

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

    scene = new SetTimePlayScene(sceneManager, audioManager, sfx);
    scene.enter({ level: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupDOM();
  });

  it('exit() 後に setTimeout コールバックが requestTransition を呼ばないこと', () => {
    // Click the confirm button
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent === 'けってい！',
    );
    confirmBtn?.click();

    // exit before timers fire
    scene.exit();

    // Advance past both 1200ms and 1500ms timers
    vi.advanceTimersByTime(2000);

    const transitionCalls = (sceneManager.requestTransition as ReturnType<typeof vi.fn>).mock.calls;
    const resultTransitions = transitionCalls.filter(
      (call: unknown[]) => call[0] === 'result',
    );
    expect(resultTransitions.length).toBe(0);
  });

  it('enter() で pendingTimers が初期化されること（再入時の防御）', () => {
    // Click the confirm button
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent === 'けってい！',
    );
    confirmBtn?.click();

    // exit and re-enter
    scene.exit();
    setupDOM();
    scene.enter({ level: 1 });

    // Advance timers
    vi.advanceTimersByTime(2000);

    const transitionCalls = (sceneManager.requestTransition as ReturnType<typeof vi.fn>).mock.calls;
    const resultTransitions = transitionCalls.filter(
      (call: unknown[]) => call[0] === 'result',
    );
    expect(resultTransitions.length).toBe(0);
  });
});
