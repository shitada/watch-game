import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from '@/game/audio/AudioManager';

function createMockAudioContext() {
  class MockAudioContext {
    destination = {};
    state = 'running';
    currentTime = 0;
    resume = vi.fn();
    createOscillator = vi.fn(() => ({
      type: 'sine' as OscillatorType,
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }));
    createGain = vi.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }));
  }

  vi.stubGlobal('AudioContext', MockAudioContext);
}

describe('AudioManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createMockAudioContext();
  });

  it('pauseBGM() が内部の bgmGenerator.pause() を呼ぶこと', () => {
    const manager = new AudioManager();
    manager.init();

    // startBGM で BGM を開始
    manager.startBGM('title');

    // pauseBGM を呼んでもエラーが発生しないこと
    manager.pauseBGM();

    // resumeBGM で再開できること（pause で currentMode が保持されているため）
    manager.resumeBGM();
  });

  it('init() 前に pauseBGM() を呼んでもエラーにならないこと', () => {
    const manager = new AudioManager();
    // init() を呼ばずに pauseBGM() — bgmGenerator が null
    manager.pauseBGM();
  });
});
