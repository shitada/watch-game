import type { ClockTime } from '@/types';
import { QuizGenerator } from './QuizGenerator';
import type { SFXGenerator } from '@/game/audio/SFXGenerator';

export interface IClock3DLike {
  animateTo(target: ClockTime, durationMs?: number): Promise<void>;
}

export interface IHintCardLike {
  highlightNumber(n: number): void;
  clearHighlight(): void;
}

export class HintSystem {
  constructor(
    private quizGen: QuizGenerator,
    private clock: IClock3DLike,
    private hintCard: IHintCardLike,
    private sfx?: SFXGenerator,
  ) {}

  async provideHint(target: ClockTime): Promise<void> {
    if (!this.quizGen.canUseHint()) return;

    // Best-effort: highlight the target number
    try {
      this.hintCard.highlightNumber(target.hours);
    } catch (e) {
      // ignore highlight failures
    }

    // Try to animate the clock; if it fails, swallow the error but continue
    try {
      await this.clock.animateTo(target);
    } catch (e) {
      // best-effort: animation may fail in tests or runtime; do not let it prevent hint state updates
      try {
        // eslint-disable-next-line no-console
        console.error('HintSystem: clock.animateTo failed', e);
      } catch {}
    } finally {
      // Ensure hint state and UI cleanup always run
      try {
        this.quizGen.useHint();
      } catch (e) {
        // swallow to avoid breaking hint flow
      }

      // Play hint SFX if provided; don't let failures or async rejections block hint flow
      try {
        const res = this.sfx?.play('hint');
        if (res && typeof (res as any)?.then === 'function') {
          (res as Promise<void>).catch(() => {});
        }
      } catch (e) {
        // swallow
      }

      try {
        this.hintCard.clearHighlight();
      } catch (e) {
        // swallow
      }
    }
  }
}
