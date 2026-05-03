import * as THREE from 'three';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TitleScene } from '@/game/scenes/TitleScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { Clock3D } from '@/game/entities/Clock3D';

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

describe('TitleScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let scene: TitleScene;
  let entered: boolean;

  beforeEach(() => {
    setupDOM();

    sceneManager = new SceneManager();
    sceneManager.requestTransition = vi.fn();

    audioManager = {
      isInitialized: vi.fn().mockReturnValue(true),
      init: vi.fn(),
      startBGM: vi.fn(),
      stopBGM: vi.fn(),
      ensureResumed: vi.fn(),
      getContext: vi.fn().mockReturnValue({}),
      getSFXGain: vi.fn().mockReturnValue({}),
    } as unknown as AudioManager;

    sfx = {
      init: vi.fn(),
      play: vi.fn(),
    } as unknown as SFXGenerator;

    scene = new TitleScene(sceneManager, audioManager, sfx);
    entered = false;
  });

  afterEach(() => {
    if (entered) {
      scene?.exit();
    }
    cleanupDOM();
  });

  // ── BGM ──

  describe('BGM', () => {
    it('enter() で startBGM("title") が呼ばれること', () => {
      scene.enter({});
      entered = true;
      expect(audioManager.startBGM).toHaveBeenCalledWith('title');
    });

    it('audioManager が未初期化の場合 startBGM が呼ばれないこと', () => {
      (audioManager.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(false);
      scene.enter({});
      entered = true;
      expect(audioManager.startBGM).not.toHaveBeenCalled();
    });

    it('exit() で stopBGM() が呼ばれること', () => {
      scene.enter({});
      entered = true;
      scene.exit();
      entered = false;
      expect(audioManager.stopBGM).toHaveBeenCalled();
    });
  });

  // ── 時計表示 ──

  describe('時計表示', () => {
    it('enter() で Clock3D の group が scene に追加されること', () => {
      scene.enter({});
      entered = true;
      const threeScene = scene.getThreeScene();
      // AmbientLight + DirectionalLight + clock3D.group + stars = 4 children
      expect(threeScene.children.length).toBeGreaterThanOrEqual(3);
    });

    it('exit() で Clock3D の group が scene から除去されること', () => {
      scene.enter({});
      entered = true;
      const threeScene = scene.getThreeScene();
      const childrenBeforeExit = threeScene.children.length;
      scene.exit();
      entered = false;
      // clock3D.group と stars が除去される
      expect(threeScene.children.length).toBe(childrenBeforeExit - 2);
    });

    it('enter→exit→enter が可能で dispose が呼ばれること', () => {
      const spy = vi.spyOn(Clock3D.prototype, 'dispose');

      scene.enter({});
      entered = true;
      scene.exit();
      entered = false;
      scene.enter({});
      entered = true;

      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  // Clock3D instantiation count
  describe('Clock3D instantiation count', () => {
    it('enter() creates Clock3D once', () => {
      const spy = vi.spyOn(Clock3D.prototype as any, 'buildClockFace');
      scene.enter({});
      entered = true;
      expect(spy).toHaveBeenCalledTimes(1);
      scene.exit();
      entered = false;
      spy.mockRestore();
    });

    it('enter->exit->enter creates one Clock3D per enter', () => {
      const spy = vi.spyOn(Clock3D.prototype as any, 'buildClockFace');
      scene.enter({});
      entered = true;
      scene.exit();
      entered = false;
      scene.enter({});
      entered = true;
      expect(spy).toHaveBeenCalledTimes(2);
      scene.exit();
      entered = false;
      spy.mockRestore();
    });
  });

  // ── 背景 stars ──

  describe('背景 stars', () => {
    it('enter() で stars パーティクルが scene に追加されること', () => {
      scene.enter({});
      entered = true;
      const threeScene = scene.getThreeScene();
      const points = threeScene.children.filter(c => c.type === 'Points');
      expect(points.length).toBe(1);
    });

    it('exit() で stars の geometry/material が dispose されること', () => {
      scene.enter({});
      entered = true;
      const threeScene = scene.getThreeScene();
      const points = threeScene.children.find(c => c.type === 'Points') as THREE.Points;
      const geoDispose = vi.spyOn(points.geometry, 'dispose');
      const matDispose = vi.spyOn(points.material as THREE.Material, 'dispose');

      scene.exit();
      entered = false;

      expect(geoDispose).toHaveBeenCalled();
      expect(matDispose).toHaveBeenCalled();
    });
  });

  // ── ボタン操作 ──

  describe('ボタン操作', () => {
    it('「あそぶ」ボタンクリックで modeSelect に遷移すること', () => {
      scene.enter({});
      entered = true;

      const playBtn = findButtonByText('あそぶ')!;
      playBtn.click();

      expect(sceneManager.requestTransition).toHaveBeenCalledWith('modeSelect');
    });

    it('「トロフィー」ボタンクリックで trophy に遷移すること', () => {
      scene.enter({});
      entered = true;

      const trophyBtn = findButtonByText('トロフィー')!;
      trophyBtn.click();

      expect(sceneManager.requestTransition).toHaveBeenCalledWith('trophy');
    });

    it('ボタンクリック時に未初期化なら audioManager.init() が呼ばれること', () => {
      (audioManager.isInitialized as ReturnType<typeof vi.fn>).mockReturnValue(false);
      scene.enter({});
      entered = true;

      const playBtn = findButtonByText('あそぶ')!;
      playBtn.click();

      expect(audioManager.init).toHaveBeenCalled();
      expect(sfx.init).toHaveBeenCalled();
    });

    it('ボタンクリック時に初期化済みなら audioManager.init() が呼ばれないこと', () => {
      scene.enter({});
      entered = true;

      const playBtn = findButtonByText('あそぶ')!;
      playBtn.click();

      expect(audioManager.init).not.toHaveBeenCalled();
    });

    it('ボタンクリックで buttonTap SFX が再生されること', () => {
      scene.enter({});
      entered = true;

      const playBtn = findButtonByText('あそぶ')!;
      playBtn.click();

      expect(sfx.play).toHaveBeenCalledWith('buttonTap');
    });
  });

  // ── DOM クリーンアップ ──

  describe('exit()', () => {
    it('exit() でオーバーレイ DOM が除去されること', () => {
      scene.enter({});
      entered = true;
      const uiOverlay = document.getElementById('ui-overlay')!;
      expect(uiOverlay.children.length).toBe(1);
      scene.exit();
      entered = false;
      expect(uiOverlay.children.length).toBe(0);
    });
  });
});
