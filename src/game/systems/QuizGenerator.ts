import type { ClockTime } from '@/types';
import { getLevelDef } from '@/game/config/LevelConfig';

export class QuizGenerator {
  generateTime(level: number): ClockTime {
    const def = getLevelDef(level);
    const hours = Math.floor(Math.random() * 12) + 1;

    if (def.minuteStep >= 60) {
      return { hours, minutes: 0 };
    }

    const steps = 60 / def.minuteStep;
    const step = Math.floor(Math.random() * steps);
    return { hours, minutes: step * def.minuteStep };
  }

  generateUniqueTime(level: number, exclude: readonly ClockTime[]): ClockTime {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const time = this.generateTime(level);
      const dup = exclude.some(
        e => e.hours === time.hours && e.minutes === time.minutes,
      );
      if (!dup) return time;
    }
    return this.generateTime(level);
  }

  generateChoices(correct: ClockTime, level: number): ClockTime[] {
    const choices: ClockTime[] = [correct];
    const def = getLevelDef(level);
    const maxAttempts = 100;
    let attempts = 0;

    while (choices.length < 4 && attempts < maxAttempts) {
      attempts++;
      const wrong = this.generateTime(level);

      if (wrong.hours === correct.hours && wrong.minutes === correct.minutes) {
        continue;
      }

      // Avoid too-similar choices for higher levels
      if (def.minuteStep <= 5) {
        const diffMin = Math.abs(
          (wrong.hours * 60 + wrong.minutes) - (correct.hours * 60 + correct.minutes),
        );
        const wrappedDiff = Math.min(diffMin, 720 - diffMin);
        if (wrappedDiff < def.minuteStep * 2 && wrappedDiff > 0) continue;
      }

      const dup = choices.some(
        c => c.hours === wrong.hours && c.minutes === wrong.minutes,
      );
      if (!dup) choices.push(wrong);
    }

    // Fallback: if not enough choices, enumerate candidates exhaustively
    if (choices.length < 4) {
      const candidates: ClockTime[] = [];
      const step = def.minuteStep >= 60 ? 60 : def.minuteStep;
      for (let h = 1; h <= 12; h++) {
        for (let m = 0; m < 60; m += step) {
          candidates.push({ hours: h, minutes: m });
        }
      }

      // First pass: respect the "too-similar" filter
      for (const cand of candidates) {
        if (choices.length >= 4) break;
        if (cand.hours === correct.hours && cand.minutes === correct.minutes) continue;
        const dup = choices.some(c => c.hours === cand.hours && c.minutes === cand.minutes);
        if (dup) continue;
        if (def.minuteStep <= 5) {
          const diffMin = Math.abs(
            (cand.hours * 60 + cand.minutes) - (correct.hours * 60 + correct.minutes),
          );
          const wrappedDiff = Math.min(diffMin, 720 - diffMin);
          if (wrappedDiff < def.minuteStep * 2 && wrappedDiff > 0) continue;
        }
        choices.push(cand);
      }

      // Second pass: ignore similarity if still not enough
      for (const cand of candidates) {
        if (choices.length >= 4) break;
        if (cand.hours === correct.hours && cand.minutes === correct.minutes) continue;
        const dup = choices.some(c => c.hours === cand.hours && c.minutes === cand.minutes);
        if (dup) continue;
        choices.push(cand);
      }
    }

    // Shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return choices;
  }
}

export function formatTime(time: ClockTime): string {
  const h = time.hours;
  const m = time.minutes;
  if (m === 0) return `${h}時`;
  if (m === 30) return `${h}時半`;
  return `${h}時${m}分`;
}
