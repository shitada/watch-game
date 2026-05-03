import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from '@/game/SceneManager';
import { SetTimePlayScene } from '@/game/scenes/SetTimePlayScene';
import { QuizPlayScene } from '@/game/scenes/QuizPlayScene';
import { DailyPlayScene } from '@/game/scenes/DailyPlayScene';

const mockAudioManager = { startBGM: () => {}, stopBGM: () => {} } as any;
const mockSFX = { play: () => {} } as any;
const sceneManager = new SceneManager();

function createMockClock() {
  const g = new THREE.Group();
  return { group: g, dispose: vi.fn(), setShowSeconds: vi.fn(), update: vi.fn(), getTime: () => ({ hours: 12, minutes: 0 }) } as any;
}

describe('Scene lifecycle', () => {
  it('SetTimePlayScene.exit should call clock3D.dispose', () => {
    const scene = new SetTimePlayScene(sceneManager, mockAudioManager, mockSFX);
    const mockClock = createMockClock();
    (scene as any).clock3D = mockClock;
    (scene as any).clockController = { dispose: vi.fn() };
    scene.exit();
    expect(mockClock.dispose).toHaveBeenCalled();
  });

  it('QuizPlayScene.exit should call clock3D.dispose', () => {
    const scene = new QuizPlayScene(sceneManager, mockAudioManager, mockSFX);
    const mockClock = createMockClock();
    (scene as any).clock3D = mockClock;
    scene.exit();
    expect(mockClock.dispose).toHaveBeenCalled();
  });

  it('DailyPlayScene.exit should call clock3D.dispose', () => {
    const scene = new DailyPlayScene(sceneManager, mockAudioManager, mockSFX);
    const mockClock = createMockClock();
    (scene as any).clock3D = mockClock;
    (scene as any).clockController = { dispose: vi.fn() };
    scene.exit();
    expect(mockClock.dispose).toHaveBeenCalled();
  });
});
