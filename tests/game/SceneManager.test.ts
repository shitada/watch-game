import { describe, it, expect, vi } from 'vitest';
import { SceneManager } from '@/game/SceneManager';
import type { Scene, SceneContext } from '@/types';
import * as THREE from 'three';

function createMockScene(): Scene {
  return {
    enter: vi.fn(),
    update: vi.fn(),
    exit: vi.fn(),
    dispose: vi.fn(),
    getThreeScene: () => new THREE.Scene(),
    getCamera: () => new THREE.PerspectiveCamera(),
  };
}

describe('SceneManager', () => {
  it('should register and transition to a scene', () => {
    const manager = new SceneManager();
    const scene = createMockScene();

    manager.register('title', scene);
    manager.transitionTo('title', {});

    expect(scene.enter).toHaveBeenCalledWith({});
    expect(manager.getCurrentType()).toBe('title');
  });

  it('should call exit on previous scene when transitioning', () => {
    const manager = new SceneManager();
    const scene1 = createMockScene();
    const scene2 = createMockScene();

    manager.register('title', scene1);
    manager.register('modeSelect', scene2);

    manager.transitionTo('title', {});
    manager.transitionTo('modeSelect', {});

    expect(scene1.dispose).toHaveBeenCalled();
    expect(scene2.enter).toHaveBeenCalled();
  });

  it('should delegate update to current scene', () => {
    const manager = new SceneManager();
    const scene = createMockScene();

    manager.register('title', scene);
    manager.transitionTo('title', {});
    manager.update(0.016);

    expect(scene.update).toHaveBeenCalledWith(0.016);
  });

  it('should use transition handler if set', () => {
    const manager = new SceneManager();
    const handler = vi.fn();
    manager.setTransitionHandler(handler);

    manager.requestTransition('title', { mode: 'quiz' });

    expect(handler).toHaveBeenCalledWith('title', { mode: 'quiz' });
  });

  it('should warn on unregistered scene', () => {
    const manager = new SceneManager();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager.transitionTo('title', {});

    expect(warnSpy).toHaveBeenCalled();
  });

  // Additional tests for continuous rendering flag
  it('currentSceneNeedsContinuousRendering respects scene opt-out', () => {
    const manager = new SceneManager();
    const staticScene: Scene = {
      enter: () => {},
      update: () => {},
      exit: () => {},
      getThreeScene: () => new THREE.Scene(),
      getCamera: () => new THREE.PerspectiveCamera(),
      // @ts-ignore allow adding optional method inline
      needsContinuousRendering: () => false,
    } as unknown as Scene;

    manager.register('title', staticScene);
    manager.transitionTo('title', {});
    // should be false because scene opts out
    // @ts-ignore access for test
    expect(manager.currentSceneNeedsContinuousRendering()).toBe(false);
  });
});
