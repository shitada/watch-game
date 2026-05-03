import type { ClockTime } from '@/types';
import { QuizGenerator } from './QuizGenerator';

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
  ) {}

  async provideHint(target: ClockTime): Promise<void> {
    if (!this.quizGen.canUseHint()) return;

    // Step 1: highlight the target number on a hint card
    try {
      this.hintCard.highlightNumber(target.hours);
    } catch (e) {
      // best-effort
    }

    // Step 2: animate clock hands to show the correct time
    await this.clock.animateTo(target);

    // Step 3: mark hint used so QuizGenerator knows
    this.quizGen.useHint();

    // clear UI highlight
    try {
      this.hintCard.clearHighlight();
    } catch (e) {
      // ignore
    }
  }
}
