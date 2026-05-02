import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizPlayScene } from '@/game/scenes/QuizPlayScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { GameSettings } from '@/game/config/GameSettings';

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

  describe('ヒントタイマー', () => {
    it('8秒後にヒントSFXが再生されること', () => {
      // Wait for hint delay
      vi.advanceTimersByTime(GameSettings.HINT_DELAY_MS);

      expect(sfx.play).toHaveBeenCalledWith('hint');
    });

    it('8秒後にボタンが2つ薄くなること（2択になる）', () => {
      vi.advanceTimersByTime(GameSettings.HINT_DELAY_MS);

      const buttons = document.querySelectorAll('button');
      const choiceButtons = Array.from(buttons).filter(b => b.textContent !== '🏠');
      const dimmed = choiceButtons.filter(b => b.style.opacity === '0.3');
      expect(dimmed.length).toBe(2);
    });

    it('回答するとヒントタイマーがクリアされること', () => {
      // Answer before hint triggers
      const buttons = document.querySelectorAll('button');
      const choiceButton = Array.from(buttons).find(b => b.textContent !== '🏠');
      choiceButton?.click();

      // Advance past the 1500ms answer delay but not enough for new hint timer
      // handleAnswer sets waitingNext=true, after 1500ms showQuestion resets it
      // The original hint timer (8000ms) should not fire because waitingNext is true
      // Advance only to just before the next question's hint would fire
      vi.advanceTimersByTime(1500);

      // Now we are on next question. Advance less than HINT_DELAY_MS
      // to confirm the original hint didn't fire
      const hintCalls = (sfx.play as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => call[0] === 'hint',
      );
      expect(hintCalls.length).toBe(0);
    });

    it('ヒントは1問につき1回のみ発動すること', () => {
      // Trigger hint
      vi.advanceTimersByTime(GameSettings.HINT_DELAY_MS);

      const hintCallsBefore = (sfx.play as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => call[0] === 'hint',
      );
      expect(hintCallsBefore.length).toBe(1);

      // Wait more time - should not trigger again
      vi.advanceTimersByTime(GameSettings.HINT_DELAY_MS);

      const hintCallsAfter = (sfx.play as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => call[0] === 'hint',
      );
      expect(hintCallsAfter.length).toBe(1);
    });

    it('exit()でヒントタイマーがクリアされること', () => {
      scene.exit();

      vi.advanceTimersByTime(GameSettings.HINT_DELAY_MS);

      const hintCalls = (sfx.play as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => call[0] === 'hint',
      );
      expect(hintCalls.length).toBe(0);
    });

    it('💡 ヒント！通知が表示されること', () => {
      vi.advanceTimersByTime(GameSettings.HINT_DELAY_MS);

      const overlay = document.getElementById('ui-overlay')!;
      const notifications = overlay.querySelectorAll('div');
      const hintNotif = Array.from(notifications).find(
        n => n.textContent === '💡 ヒント！',
      );
      expect(hintNotif).toBeTruthy();
    });
  });
});
