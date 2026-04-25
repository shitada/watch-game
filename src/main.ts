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

// ── Renderer ──
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Singletons ──
const sceneManager = new SceneManager();
const gameLoop = new GameLoop();
const audioManager = new AudioManager();
const sfx = new SFXGenerator();
const saveManager = new SaveManager();

// ── Scenes ──
const titleScene = new TitleScene(sceneManager, audioManager, sfx);
const modeSelectScene = new ModeSelectScene(sceneManager, audioManager, sfx);
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

// ── Transition Handler ──
sceneManager.setTransitionHandler((type, context) => {
  sceneManager.transitionTo(type, context);
});

// ── Start ──
sceneManager.transitionTo('title', {});

const onUpdate = (dt: number) => {
  sceneManager.update(dt);
};

const onRender = () => {
  const threeScene = sceneManager.getCurrentThreeScene();
  const camera = sceneManager.getCurrentCamera();
  if (threeScene && camera) {
    renderer.render(threeScene, camera);
  }
};

gameLoop.start(onUpdate, onRender);

// ── Resize ──
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  sceneManager.updateAllCamerasAspect(window.innerWidth / window.innerHeight);
});

// ── Visibility ──
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    gameLoop.pause();
    audioManager.stopBGM();
  } else {
    gameLoop.resume(onUpdate, onRender);
    audioManager.ensureResumed();
    audioManager.resumeBGM();
  }
});

// Prevent context menu on long-press
document.addEventListener('contextmenu', (e) => e.preventDefault());
