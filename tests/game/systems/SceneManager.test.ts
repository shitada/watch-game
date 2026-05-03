import { describe, it, expect, vi } from 'vitest';
import { SceneManager } from '@/game/SceneManager';
import type { Scene } from '@/types';

describe('SceneManager disposal with scene-owned Clock3D', () => {
  it('calls exit on previous scene which disposes its Clock3D', () => {
    const manager = new SceneManager();

    // mock clock-like object with dispose spy
    const mockClock = { dispose: vi.fn() } as any;

    // sceneA has no dispose() method intentionally so SceneManager will call exit()
    const sceneA: Scene = {
      enter: () => {
        // simulate creating clock on enter
        (sceneA as any)._clock = mockClock;
      },
      update: () => {},
      exit: () => {
        // scene exit disposes the clock
        (sceneA as any)._clock.dispose();
      },
      getThreeScene: () => null as any,
      getCamera: () => null as any,
    } as unknown as Scene;

    const sceneB: Scene = {
      enter: vi.fn(),
      update: () => {},
      exit: () => {},
      getThreeScene: () => null as any,
      getCamera: () => null as any,
    } as unknown as Scene;

    manager.register('title', sceneA);
    manager.register('modeSelect', sceneB);

    manager.transitionTo('title', {});
    // transition away; this should call sceneA.exit() which disposes the clock
    manager.transitionTo('modeSelect', {});

    expect(mockClock.dispose).toHaveBeenCalled();
  });
});
