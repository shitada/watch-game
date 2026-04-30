import type { BGMMode } from '@/types';

interface ChordDef {
  frequencies: number[];
  duration: number;
}

const CHORDS: Record<BGMMode, ChordDef[]> = {
  title: [
    { frequencies: [261.6, 329.6, 392.0], duration: 0.8 }, // C
    { frequencies: [349.2, 440.0, 523.3], duration: 0.8 }, // F
    { frequencies: [392.0, 493.9, 587.3], duration: 0.8 }, // G
    { frequencies: [261.6, 329.6, 392.0], duration: 0.8 }, // C
  ],
  play: [
    { frequencies: [220.0, 261.6, 329.6], duration: 1.0 }, // Am
    { frequencies: [174.6, 220.0, 261.6], duration: 1.0 }, // F
    { frequencies: [261.6, 329.6, 392.0], duration: 1.0 }, // C
    { frequencies: [196.0, 246.9, 293.7], duration: 1.0 }, // G
  ],
  result: [
    { frequencies: [261.6, 329.6, 392.0], duration: 0.6 }, // C
    { frequencies: [329.6, 415.3, 493.9], duration: 0.6 }, // E
    { frequencies: [349.2, 440.0, 523.3], duration: 0.6 }, // F
    { frequencies: [392.0, 493.9, 587.3], duration: 1.2 }, // G
  ],
};

const MELODIES: Record<BGMMode, number[]> = {
  title: [523.3, 587.3, 659.3, 784.0, 659.3, 523.3, 587.3, 523.3],
  play:  [440.0, 392.0, 349.2, 329.6, 349.2, 392.0, 440.0, 392.0],
  result: [523.3, 659.3, 784.0, 1047, 784.0, 659.3, 784.0, 1047],
};

export class BGMGenerator {
  private context: AudioContext;
  private destination: GainNode;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private playing = false;
  private currentMode: BGMMode | null = null;

  constructor(context: AudioContext, destination: GainNode) {
    this.context = context;
    this.destination = destination;
  }

  start(mode: BGMMode): void {
    this.stop();
    this.playing = true;
    this.currentMode = mode;
    this.scheduleLoop(mode);
  }

  stop(): void {
    this.playing = false;
    this.currentMode = null;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  pause(): void {
    this.playing = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  resume(): void {
    if (this.currentMode && !this.playing) {
      this.playing = true;
      this.scheduleLoop(this.currentMode);
    }
  }

  private scheduleLoop(mode: BGMMode): void {
    const chords = CHORDS[mode];
    const melody = MELODIES[mode];
    let offset = 0;
    const melodyIdx = { value: 0 };

    for (const chord of chords) {
      const t = setTimeout(() => {
        if (!this.playing) return;
        this.playChord(chord.frequencies, chord.duration);

        const noteDur = chord.duration / 2;
        for (let i = 0; i < 2; i++) {
          const nt = setTimeout(() => {
            if (!this.playing) return;
            const freq = melody[melodyIdx.value % melody.length];
            melodyIdx.value++;
            this.playNote(freq, 'triangle', noteDur * 0.8, 0.15);
          }, i * noteDur * 1000);
          this.timers.push(nt);
        }
      }, offset * 1000);
      this.timers.push(t);
      offset += chord.duration;
    }

    const loopTimer = setTimeout(() => {
      if (this.playing) this.scheduleLoop(mode);
    }, offset * 1000);
    this.timers.push(loopTimer);
  }

  private playChord(frequencies: number[], duration: number): void {
    for (const freq of frequencies) {
      this.playNote(freq, 'sine', duration, 0.06);
    }
  }

  private playNote(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
  ): void {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.context.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(this.destination);
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }
}
