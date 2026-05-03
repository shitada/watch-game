import * as THREE from 'three';

// ── Scene Types ──

export type SceneType =
  | 'title'
  | 'modeSelect'
  | 'levelSelect'
  | 'quizPlay'
  | 'setTimePlay'
  | 'dailyPlay'
  | 'result'
  | 'trophy';

export type GameMode = 'quiz' | 'setTime' | 'daily';

export interface SceneContext {
  mode?: GameMode;
  level?: number;
  results?: QuizResult[];
}

export interface Scene {
  enter(context: SceneContext): void;
  update(deltaTime: number): void;
  exit(): void;
  // Dispose releases Three.js GPU resources and any heavy references. Implementations
  // should ensure calling dispose multiple times is safe (idempotent).
  dispose(): void;
  getThreeScene(): THREE.Scene;
  getCamera(): THREE.Camera;
  // Optional: if provided and returns false, the engine may stop the continuous
  // render loop while the scene is active to save CPU on idle/static screens.
  // If not implemented, defaults to true (continuous rendering required).
  // NOTE: Scene.exit() is responsible for releasing DOM-level resources; dispose()
  // is for Three.js / GPU resource cleanup. The engine also provides a defensive
  // utility `safeDisposeScene` as a fallback.
  needsContinuousRendering?(): boolean;
}

// ── Game Data Types ──

export interface QuizResult {
  questionIndex: number;
  targetTime: ClockTime;
  answerTime: ClockTime;
  correct: boolean;
}

export interface ClockTime {
  hours: number;   // 1-12
  minutes: number; // 0-59
}

export interface LevelDefinition {
  level: number;
  name: string;
  description: string;
  minuteStep: number;        // 60=正時, 30=30分, 5=5分, 1=1分
  questionCount: number;
  tolerance: number;         // 許容誤差(分)
}

export interface DailyEvent {
  id: string;
  name: string;
  emoji: string;
  time: ClockTime;
}

// ── Save Data ──

export interface SaveData {
  // Save format version. Increment when making incompatible shape changes.
  version: number;
  completedLevels: Record<GameMode, number[]>;
  trophies: string[];
  totalCorrect: number;
  totalPlays: number;
  bestScores: Record<string, number>; // "quiz-1" → best correct count
  streak?: number;
}

// ── SFX Types ──

export type SFXType =
  | 'correct'
  | 'incorrect'
  | 'hint'
  | 'levelClear'
  | 'allClear'
  | 'buttonTap'
  | 'tick'
  | 'clockSet';

// ── BGM Types ──

export type BGMMode = 'title' | 'play' | 'result';

// ── Transition Handler ──

export type TransitionHandler = (
  sceneType: SceneType,
  context: SceneContext,
) => void;
