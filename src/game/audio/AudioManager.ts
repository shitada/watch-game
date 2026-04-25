import type { BGMMode } from '@/types';
import { BGMGenerator } from './BGMGenerator';

export class AudioManager {
  private context: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGenerator: BGMGenerator | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.context = new AudioContext();
    this.bgmGain = this.context.createGain();
    this.bgmGain.gain.value = 0.3;
    this.bgmGain.connect(this.context.destination);
    this.sfxGain = this.context.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.context.destination);
    this.bgmGenerator = new BGMGenerator(this.context, this.bgmGain);
    this.initialized = true;
  }

  getContext(): AudioContext | null {
    return this.context;
  }

  getSFXGain(): GainNode | null {
    return this.sfxGain;
  }

  startBGM(mode: BGMMode): void {
    this.bgmGenerator?.start(mode);
  }

  stopBGM(): void {
    this.bgmGenerator?.stop();
  }

  resumeBGM(): void {
    this.bgmGenerator?.resume();
  }

  ensureResumed(): void {
    if (this.context?.state === 'suspended') {
      this.context.resume();
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
