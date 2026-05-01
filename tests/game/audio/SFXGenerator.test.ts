import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import type { SFXType } from '@/types';

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
    createOscillator: vi.fn(() => ({
      ...mockOscillator,
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      ...mockGainNode,
      gain: { ...mockGainNode.gain, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  } as unknown as AudioContext;

  const destination = {
    ...mockGainNode,
    gain: { ...mockGainNode.gain },
  } as unknown as GainNode;

  return { context, destination };
}

describe('SFXGenerator', () => {
  let generator: SFXGenerator;
  let context: AudioContext;
  let destination: GainNode;

  beforeEach(() => {
    vi.useFakeTimers();
    const mock = createMockAudioContext();
    context = mock.context;
    destination = mock.destination;
    generator = new SFXGenerator();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('init()', () => {
    it('init() で context と destination が設定されること', () => {
      generator.init(context, destination);
      // init 後に play() がエラーなく動作すれば設定されている
      generator.play('buttonTap');
      expect(context.createOscillator).toHaveBeenCalled();
    });
  });

  describe('init() 前の安全性', () => {
    it('init() 前に play() を呼んでもエラーにならないこと', () => {
      expect(() => generator.play('correct')).not.toThrow();
      expect(() => generator.play('incorrect')).not.toThrow();
      expect(() => generator.play('buttonTap')).not.toThrow();
    });

    it('init() 前は createOscillator が呼ばれないこと', () => {
      generator.play('correct');
      expect(context.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('全 SFX タイプの再生', () => {
    const allTypes: SFXType[] = [
      'correct',
      'incorrect',
      'hint',
      'levelClear',
      'allClear',
      'buttonTap',
      'tick',
      'clockSet',
    ];

    it.each(allTypes)('play("%s") が createOscillator を呼ぶこと', (type) => {
      generator.init(context, destination);
      generator.play(type);
      vi.advanceTimersByTime(5000);
      expect(context.createOscillator).toHaveBeenCalled();
    });
  });

  describe('playNote 検証（buttonTap / tick 経由）', () => {
    it('buttonTap で createOscillator が 1 回呼ばれること', () => {
      generator.init(context, destination);
      generator.play('buttonTap');
      expect(context.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('tick で createOscillator が 1 回呼ばれること', () => {
      generator.init(context, destination);
      generator.play('tick');
      expect(context.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('buttonTap でオシレーターの start と stop が呼ばれること', () => {
      generator.init(context, destination);
      generator.play('buttonTap');
      const osc = (context.createOscillator as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    });

    it('buttonTap で gain の setValueAtTime と exponentialRampToValueAtTime が呼ばれること', () => {
      generator.init(context, destination);
      generator.play('buttonTap');
      const gainNode = (context.createGain as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
      expect(gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('playFanfare 検証（correct / levelClear / allClear 経由）', () => {
    it('correct で setTimeout 経由で 3 ノート再生されること', () => {
      generator.init(context, destination);
      generator.play('correct');
      vi.advanceTimersByTime(5000);
      expect(context.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('levelClear で setTimeout 経由で 4 ノート再生されること', () => {
      generator.init(context, destination);
      generator.play('levelClear');
      vi.advanceTimersByTime(5000);
      expect(context.createOscillator).toHaveBeenCalledTimes(4);
    });

    it('allClear で setTimeout 経由で 6 ノート再生されること', () => {
      generator.init(context, destination);
      generator.play('allClear');
      vi.advanceTimersByTime(5000);
      expect(context.createOscillator).toHaveBeenCalledTimes(6);
    });

    it('correct の最初のノートは delay=0 で再生されること', () => {
      generator.init(context, destination);
      generator.play('correct');
      // fake timers では delay=0 の setTimeout も advanceTimersByTime が必要
      vi.advanceTimersByTime(0);
      expect(context.createOscillator).toHaveBeenCalledTimes(1);
    });
  });

  describe('playTone 検証（incorrect / hint 経由）', () => {
    it('incorrect で setTimeout 経由で 2 ノート再生されること', () => {
      generator.init(context, destination);
      generator.play('incorrect');
      vi.advanceTimersByTime(5000);
      expect(context.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('hint で setTimeout 経由で 2 ノート再生されること', () => {
      generator.init(context, destination);
      generator.play('hint');
      vi.advanceTimersByTime(5000);
      expect(context.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('incorrect の最初のノートは delay=0 で再生されること', () => {
      generator.init(context, destination);
      generator.play('incorrect');
      // fake timers では delay=0 でも advanceTimersByTime が必要
      vi.advanceTimersByTime(0);
      expect(context.createOscillator).toHaveBeenCalledTimes(1);
    });
  });

  describe('playChord 検証（clockSet 経由）', () => {
    it('clockSet で 3 つの音が同時に再生されること', () => {
      generator.init(context, destination);
      generator.play('clockSet');
      // playChord は setTimeout を使わないため即時に 3 回呼ばれる
      expect(context.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('clockSet で各オシレーターが connect → start → stop されること', () => {
      generator.init(context, destination);
      generator.play('clockSet');
      const results = (context.createOscillator as ReturnType<typeof vi.fn>).mock.results;
      expect(results).toHaveLength(3);
      for (const result of results) {
        const osc = result.value;
        expect(osc.connect).toHaveBeenCalled();
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();
      }
    });
  });
});
