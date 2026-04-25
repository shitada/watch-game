import type { SFXType } from '@/types';

export class SFXGenerator {
  private context: AudioContext | null = null;
  private destination: GainNode | null = null;

  init(context: AudioContext, destination: GainNode): void {
    this.context = context;
    this.destination = destination;
  }

  play(type: SFXType): void {
    if (!this.context || !this.destination) return;

    switch (type) {
      case 'correct':
        this.playFanfare([523.3, 659.3, 784.0], 0.12);
        break;
      case 'incorrect':
        this.playTone([293.7, 220.0], 'square', 0.15, 0.1);
        break;
      case 'hint':
        this.playTone([440.0, 523.3], 'triangle', 0.15, 0.08);
        break;
      case 'levelClear':
        this.playFanfare([523.3, 659.3, 784.0, 1047], 0.2);
        break;
      case 'allClear':
        this.playFanfare([392.0, 493.9, 587.3, 659.3, 784.0, 1047], 0.18);
        break;
      case 'buttonTap':
        this.playNote(880, 'sine', 0.08, 0.1);
        break;
      case 'tick':
        this.playNote(1200, 'sine', 0.03, 0.05);
        break;
      case 'clockSet':
        this.playChord([523.3, 659.3, 784.0], 'sine', 0.3, 0.12);
        break;
    }
  }

  private playNote(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number,
  ): void {
    if (!this.context || !this.destination) return;
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

  private playTone(
    freqs: number[],
    type: OscillatorType,
    duration: number,
    volume: number,
  ): void {
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playNote(freq, type, duration, volume);
      }, i * duration * 500);
    });
  }

  private playChord(
    freqs: number[],
    type: OscillatorType,
    duration: number,
    volume: number,
  ): void {
    for (const freq of freqs) {
      this.playNote(freq, type, duration, volume);
    }
  }

  private playFanfare(notes: number[], noteDuration: number): void {
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playNote(freq, 'triangle', noteDuration, 0.15);
      }, i * noteDuration * 800);
    });
  }
}
