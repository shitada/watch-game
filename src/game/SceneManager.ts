import type { Scene, SceneType, SceneContext, TransitionHandler } from '@/types';
import * as THREE from 'three';

export class SceneManager {
  private scenes = new Map<SceneType, Scene>();
  private currentScene: Scene | null = null;
  private currentType: SceneType | null = null;
  private transitionHandler: TransitionHandler | null = null;

  register(type: SceneType, scene: Scene): void {
    this.scenes.set(type, scene);
  }

  setTransitionHandler(handler: TransitionHandler): void {
    this.transitionHandler = handler;
  }

  transitionTo(type: SceneType, context: SceneContext = {}): void {
    const next = this.scenes.get(type);
    if (!next) {
      console.warn(`Scene "${type}" not registered`);
      return;
    }

    if (this.currentScene) {
      this.currentScene.exit();
    }

    this.currentScene = next;
    this.currentType = type;
    this.currentScene.enter(context);
  }

  requestTransition(type: SceneType, context: SceneContext = {}): void {
    if (this.transitionHandler) {
      this.transitionHandler(type, context);
    } else {
      this.transitionTo(type, context);
    }
  }

  update(deltaTime: number): void {
    this.currentScene?.update(deltaTime);
  }

  getCurrentThreeScene() {
    return this.currentScene?.getThreeScene() ?? null;
  }

  getCurrentCamera() {
    return this.currentScene?.getCamera() ?? null;
  }

  getCurrentType(): SceneType | null {
    return this.currentType;
  }

  updateAllCamerasAspect(aspect: number): void {
    for (const scene of this.scenes.values()) {
      const cam = scene.getCamera();
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.aspect = aspect;
        cam.updateProjectionMatrix();
      }
    }
  }
}
