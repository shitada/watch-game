import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TitleScene } from '@/game/scenes/TitleScene';
import { SceneManager } from '@/game/SceneManager';
import { Clock3D } from '@/game/entities/Clock3D';

// Minimal stubs for AudioManager and SFXGenerator used by scenes
const makeAudioStub = () => ({
  isInitialized: () => false,
  startBGM: (_: string) => {},
  stopBGM: () => {},
  init: () => {},
  ensureResumed: () => {},
  getContext: () => null,
  getSFXGain: () => null,
});

const makeSFXStub = () => ({
  init: (_ctx: any, _gain: any) => {},
  play: (_: string) => {},
});

describe('Clock disposal on scene exit', () => {
  let uiOverlay: HTMLDivElement;
  let hud: HTMLDivElement;
  let disposeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Prepare DOM elements expected by scenes
    uiOverlay = document.createElement('div');
    uiOverlay.id = 'ui-overlay';
    document.body.appendChild(uiOverlay);

    hud = document.createElement('div');
    hud.id = 'hud';
    document.body.appendChild(hud);

    // Reset shared caches to avoid cross-test leakage
    (Clock3D as any)._sharedNumbers = { texture: undefined, refCount: 0 };
    (Clock3D as any)._sharedTicks = { majorGeo: undefined, minorGeo: undefined, majorMat: undefined, minorMat: undefined, refCount: 0 };

    disposeSpy = vi.spyOn(Clock3D.prototype, 'dispose');
  });

  afterEach(() => {
    disposeSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('TitleScene should dispose Clock3D on exit and remove clock elements from scene', () => {
    const sceneManager = new SceneManager();
    const audio = makeAudioStub();
    const sfx = makeSFXStub();

    const scene = new TitleScene(sceneManager, (audio as any), (sfx as any));

    // Enter the scene -> clock created
    scene.enter({});

    expect(disposeSpy).not.toHaveBeenCalled();

    // Ensure clock face exists in three scene while entered
    const threeScene = scene.getThreeScene();
    const foundBefore = threeScene.getObjectByName('clockFace');
    expect(foundBefore).toBeTruthy();

    // Exit -> should remove group and call dispose
    scene.exit();

    expect(disposeSpy).toHaveBeenCalled();

    const foundAfter = threeScene.getObjectByName('clockFace');
    expect(foundAfter).toBeUndefined();
  });
});
