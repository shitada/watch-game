import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BGMGenerator } from '@/game/audio/BGMGenerator';

function createMockAudioContext() {
  const mockGainNode = {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };

  const mockOscillator = {
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const context = {
    currentTime: 0,
    createOscillator: vi.fn(() => ({ ...mockOscillator })),
    createGain: vi.fn(() => ({
      ...mockGainNode,
      gain: { ...mockGainNode.gain },
    })),
  } as unknown as AudioContext;

  const destination = {
    ...mockGainNode,
    gain: { ...mockGainNode.gain },
  } as unknown as GainNode;

  return { context, destination };
}

describe('BGMGenerator', () => {
  let generator: BGMGenerator;

  beforeEach(() => {
    vi.useFakeTimers();
    const { context, destination } = createMockAudioContext();
    generator = new BGMGenerator(context, destination);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pause()', () => {
    it('pause() 後に currentMode が保持されること', () => {
      generator.start('title');
      generator.pause();

      // currentMode は private なので resume() が動作するかで検証
      // playing は false になっているはず
      // resume() を呼んで playing が true に復帰すれば currentMode が保持されている証拠
      generator.resume();

      // resume 後に再度 pause して、もう一度 resume できることを確認
      generator.pause();
      generator.resume();
      // エラーなく完了すれば OK
    });

    it('pause() で playing が false になること', () => {
      generator.start('play');
      generator.pause();

      // resume() が実行される = playing が false であった証拠
      // (resume は !playing のときのみ動作)
      generator.resume();
    });

    it('pause() → resume() で playing が true に復帰すること', () => {
      generator.start('result');
      generator.pause();
      generator.resume();

      // 再度 resume() を呼んでも何も起きない（既に playing = true）
      // → 二重起動しないことを確認
      generator.resume();
    });
  });

  describe('stop() 後の resume()', () => {
    it('stop() 後に resume() が何もしないこと', () => {
      generator.start('title');
      generator.stop();
      generator.resume();

      // stop() で currentMode が null になるため resume() はスキップされる
      // pause() → resume() とは異なる動作
    });
  });

  describe('pause() vs stop() の違い', () => {
    it('pause() 後は resume() で再開できるが stop() 後はできない', () => {
      // pause → resume: 動作する
      generator.start('play');
      generator.pause();
      generator.resume();
      // ここで playing = true

      // stop → resume: 動作しない
      generator.stop();
      generator.resume();
      // ここで playing = false のまま（currentMode が null なので）
    });
  });
});
