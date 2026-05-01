import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrophyScene } from '@/game/scenes/TrophyScene';
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

function findButtonByText(text: string): HTMLButtonElement | undefined {
  const buttons = document.querySelectorAll('button');
  return Array.from(buttons).find(b => b.textContent?.includes(text));
}

describe('TrophyScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let saveManager: SaveManager;
  let scene: TrophyScene;

  beforeEach(() => {
    setupDOM();
    localStorage.clear();

    sceneManager = new SceneManager();
    sceneManager.requestTransition = vi.fn();

    audioManager = {
      isInitialized: vi.fn().mockReturnValue(true),
      startBGM: vi.fn(),
      stopBGM: vi.fn(),
    } as unknown as AudioManager;

    sfx = {
      play: vi.fn(),
    } as unknown as SFXGenerator;

    saveManager = new SaveManager();
    scene = new TrophyScene(sceneManager, audioManager, sfx, saveManager);
  });

  afterEach(() => {
    scene?.exit();
    cleanupDOM();
  });

  // ── BGM ──

  describe('BGM', () => {
    it('enter() で startBGM("title") が呼ばれること', () => {
      scene.enter({});
      expect(audioManager.startBGM).toHaveBeenCalledWith('title');
    });

    it('audioManager が未初期化の場合 startBGM が呼ばれないこと', () => {
      (audioManager.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(false);
      scene.enter({});
      expect(audioManager.startBGM).not.toHaveBeenCalled();
    });

    it('exit() で stopBGM() が呼ばれること', () => {
      scene.enter({});
      scene.exit();
      expect(audioManager.stopBGM).toHaveBeenCalled();
    });
  });

  // ── トロフィー表示 ──

  describe('トロフィー表示', () => {
    it('獲得済みトロフィーが正しい emoji・ラベルで表示されること', () => {
      saveManager.addTrophy('quiz-1-perfect');
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.textContent).toContain('🥉');
      expect(uiOverlay.textContent).toContain('なんじかな？ レベル1');
    });

    it('未獲得トロフィーが ❓ / ??? で表示されること', () => {
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.textContent).toContain('❓');
      expect(uiOverlay.textContent).toContain('???');
    });

    it('トロフィー数が「earned / 9」形式で表示されること', () => {
      saveManager.addTrophy('quiz-1-perfect');
      saveManager.addTrophy('quiz-2-perfect');
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.textContent).toContain('2 / 9');
    });
  });

  // ── 統計表示 ──

  describe('統計表示', () => {
    it('totalPlays と totalCorrect が表示されること', () => {
      const data = saveManager.load();
      data.totalPlays = 10;
      data.totalCorrect = 35;
      saveManager.save(data);

      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.textContent).toContain('10');
      expect(uiOverlay.textContent).toContain('35');
    });
  });

  // ── 戻るボタン ──

  describe('戻るボタン', () => {
    it('戻るボタンクリックで title に遷移すること', () => {
      scene.enter({});

      const backBtn = findButtonByText('もどる')!;
      backBtn.click();

      expect(sceneManager.requestTransition).toHaveBeenCalledWith('title');
    });

    it('戻るボタンクリックで buttonTap SFX が再生されること', () => {
      scene.enter({});

      const backBtn = findButtonByText('もどる')!;
      backBtn.click();

      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
    });
  });

  // ── exit() ──

  describe('exit()', () => {
    it('exit() でオーバーレイ DOM が除去されること', () => {
      scene.enter({});
      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.children.length).toBe(1);
      scene.exit();
      expect(uiOverlay.children.length).toBe(0);
    });
  });
});
