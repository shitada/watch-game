import type { ClockTime } from '@/types';

export class TimeValidator {
  validate(
    target: ClockTime,
    answer: ClockTime,
    toleranceMinutes: number,
  ): boolean {
    const targetTotal = target.hours * 60 + target.minutes;
    const answerTotal = answer.hours * 60 + answer.minutes;
    const diff = Math.abs(targetTotal - answerTotal);
    // Handle wrap-around (e.g., 12:55 vs 1:05 on a 12-hour clock)
    const wrappedDiff = Math.min(diff, 12 * 60 - diff);
    return wrappedDiff <= toleranceMinutes;
  }
}
