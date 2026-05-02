import * as THREE from 'three';
import { GameLoop } from '@/game/GameLoop';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { TitleScene } from '@/game/scenes/TitleScene';
import { ModeSelectScene } from '@/game/scenes/ModeSelectScene';
import { LevelSelectScene } from '@/game/scenes/LevelSelectScene';
import { QuizPlayScene } from '@/game/scenes/QuizPlayScene';
import { SetTimePlayScene } from '@/game/scenes/SetTimePlayScene';
import { DailyPlayScene } from '@/game/scenes/DailyPlayScene';
import { ResultScene } from '@/game/scenes/ResultScene';
import { TrophyScene } from '@/game/scenes/TrophyScene';
import { TransitionOverlay } from '@/ui/TransitionOverlay';
import { PerformanceManager } from '@/game/systems/PerformanceManager';

// ── Renderer ──
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Performance Manager ──
const perfManager = new PerformanceManager(renderer, {
  qualityLevels: [1, 1.5, 2],
  sampleSize: 30,
  thresholds: { highMs: 40, lowMs: 18 },
  cooldownMs: 2000,
});
// Apply initial configuration
perfManager.applyInitial();

// ── Singletons ──
const sceneManager = new SceneManager();
const gameLoop = new GameLoop();
const audioManager = new AudioManager();
const sfx = new SFXGenerator();
const saveManager = new SaveManager();

// ── Scenes ──
const titleScene = new TitleScene(sceneManager, audioManager, sfx);
const modeSelectScene = new ModeSelectScene(sceneManager, audioManager, sfx, saveManager);
const levelSelectScene = new LevelSelectScene(sceneManager, audioManager, sfx, saveManager);
const quizPlayScene = new QuizPlayScene(sceneManager, audioManager, sfx);
const setTimePlayScene = new SetTimePlayScene(sceneManager, audioManager, sfx);
const dailyPlayScene = new DailyPlayScene(sceneManager, audioManager, sfx);
const resultScene = new ResultScene(sceneManager, audioManager, sfx, saveManager);
const trophyScene = new TrophyScene(sceneManager, audioManager, sfx, saveManager);

// Inject renderer into scenes that need it
setTimePlayScene.setRenderer(renderer);
dailyPlayScene.setRenderer(renderer);

// ── Register Scenes ──
sceneManager.register('title', titleScene);
sceneManager.register('modeSelect', modeSelectScene);
sceneManager.register('levelSelect', levelSelectScene);
sceneManager.register('quizPlay', quizPlayScene);
sceneManager.register('setTimePlay', setTimePlayScene);
sceneManager.register('dailyPlay', dailyPlayScene);
sceneManager.register('result', resultScene);
sceneManager.register('trophy', trophyScene);

// ── Transition Overlay ──
const overlay = new TransitionOverlay();
overlay.mount(document.body);

// ── Transition Handler ──
sceneManager.setTransitionHandler((type, context) => {
  if (overlay.isTransitioning()) return;
  overlay.fadeOut(() => {
    sceneManager.transitionTo(type, context);
    // Ensure render loop state is updated after transition and render one frame
    updateRenderLoopState();
    const threeScene = sceneManager.getCurrentThreeScene();
    const camera = sceneManager.getCurrentCamera();
    if (threeScene && camera) renderer.render(threeScene, camera);
    overlay.fadeIn();
  });
});

// ── Start ──
sceneManager.transitionTo('title', {});

const onUpdate = (dt: number) => {
  // Record frame time (ms) so PerformanceManager can adapt pixel ratio
  perfManager.recordFrame(dt * 1000);
  sceneManager.update(dt);
};

const onRender = () => {
  const threeScene = sceneManager.getCurrentThreeScene();
  const camera = sceneManager.getCurrentCamera();
  if (threeScene && camera) {
    renderer.render(threeScene, camera);
  }
};

/**
 * Update the game loop state based on current scene's needs.
 * If continuous rendering is required, ensure the loop is running.
 * Otherwise pause the loop but keep the last frame rendered.
 */
function updateRenderLoopState() {
  const needs = sceneManager.currentSceneNeedsContinuousRendering();
  if (needs) {
    // Restart loop to ensure fresh timing. We pause first to avoid duplicate loops.
    gameLoop.pause();
    gameLoop.start(onUpdate, onRender);
  } else {
    // Pause continuous loop to save CPU. Ensure one frame is rendered so screen isn't blank.
    gameLoop.pause();
    const threeScene = sceneManager.getCurrentThreeScene();
    const camera = sceneManager.getCurrentCamera();
    if (threeScene && camera) {
      renderer.render(threeScene, camera);
    }
  }
}

// Initial render loop state
updateRenderLoopState();

// ── Resize ──
window.addEventListener('resize', () => {
  perfManager.onResize(window.innerWidth, window.innerHeight);
  sceneManager.updateAllCamerasAspect(window.innerWidth / window.innerHeight);
});

// ── Visibility ──
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gameLoop.pause();
    audioManager.pauseBGM();
  } else {
    // On visibility resume, only resume continuous loop if current scene needs it.
    if (sceneManager.currentSceneNeedsContinuousRendering()) {
      gameLoop.resume(onUpdate, onRender);
    } else {
      // Render a single frame to ensure UI shows correctly
      const threeScene = sceneManager.getCurrentThreeScene();
      const camera = sceneManager.getCurrentCamera();
      if (threeScene && camera) renderer.render(threeScene, camera);
    }
    audioManager.ensureResumed();
    audioManager.resumeBGM();
  }
});

// Prevent context menu on long-press
document.addEventListener('contextmenu', (e) => e.preventDefault());
