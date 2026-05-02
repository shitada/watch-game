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

  it('handleConfirm() 後にボタンが視覚的に無効化されること', () => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent === 'けってい！',
    )!;
    confirmBtn.click();

    expect(confirmBtn.style.opacity).toBe('0.5');
    expect(confirmBtn.style.pointerEvents).toBe('none');
    expect(confirmBtn.style.cursor).toBe('default');
    expect(confirmBtn.style.transform).toBe('scale(1)');
  });

  it('次の問題表示後にボタンが再度有効化されること', () => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent === 'けってい！',
    )!;
    confirmBtn.click();

    // 1500ms 後に次の問題が表示される
    vi.advanceTimersByTime(1500);

    expect(confirmBtn.style.opacity).toBe('1');
    expect(confirmBtn.style.pointerEvents).toBe('auto');
    expect(confirmBtn.style.cursor).toBe('pointer');
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

  it('不正解時に CurrentTimeDisplay が正解の時刻に更新されること', () => {
    // Clock starts at 12:00. We need the target to differ from 12:00.
    // Level 1 generates hour-only times (1-12). We mock Math.random to generate hour=3.
    scene.exit();
    cleanupDOM();
    setupDOM();

    // Mock random to produce hour=3 (index 2 of 1-12 range)
    const origRandom = Math.random;
    let callCount = 0;
    Math.random = () => {
      callCount++;
      return 0.2; // floor(0.2 * 12) + 1 = 3
    };

    const scene2 = new SetTimePlayScene(sceneManager, audioManager, sfx);
    scene2.enter({ level: 1 });
    Math.random = origRandom;

    const currentTimeEl = document.querySelector('[data-testid="current-time"]') as HTMLElement;
    // Initially 12:00
    expect(currentTimeEl.textContent).toBe('12時');

    // Confirm without moving clock → answer is 12:00, target is 3:00 → incorrect
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent === 'けってい！',
    )!;
    confirmBtn.click();

    // CurrentTimeDisplay should now show the correct answer "3時"
    expect(currentTimeEl.textContent).toBe('3時');

    scene2.exit();
  });

  it('enter() で CurrentTimeDisplay に初期時刻 12:00 が表示されること', () => {
    const currentTimeEl = document.querySelector('[data-testid="current-time"]') as HTMLElement;
    expect(currentTimeEl).not.toBeNull();
    expect(currentTimeEl.textContent).toBe('12時');
  });

  it('exit() で CurrentTimeDisplay が unmount されること', () => {
    expect(document.querySelector('[data-testid="current-time"]')).not.toBeNull();
    scene.exit();
    expect(document.querySelector('[data-testid="current-time"]')).toBeNull();
  });
});
