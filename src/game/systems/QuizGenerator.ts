import type { ClockTime } from '@/types';
import { getLevelDef } from '@/game/config/LevelConfig';

export class QuizGenerator {
  private rng: () => number;
  private streak = 0;
  private difficultyLevel = 1; // 1 = easy, 2 = medium, 3 = hard
  private readonly DIFFICULTY_THRESHOLDS = [3, 6];
  private readonly DEFAULT_CHOICE_COUNT = 4; // stable number of options

  constructor(rng?: () => number) {
    this.rng = rng ?? Math.random;
  }

  // Hint state: one hint per question
  private hintUsedForQuestion = false;

  startQuestion(): void {
    this.hintUsedForQuestion = false;
  }

  canUseHint(): boolean {
    return !this.hintUsedForQuestion;
  }

  useHint(): void {
    this.hintUsedForQuestion = true;
  }

  remainingHints(): number {
    return this.canUseHint() ? 1 : 0;
  }

  onAnswerCorrect() {
    this.streak++;
    if (this.streak >= this.DIFFICULTY_THRESHOLDS[1]) this.difficultyLevel = 3;
    else if (this.streak >= this.DIFFICULTY_THRESHOLDS[0]) this.difficultyLevel = 2;
  }

  onAnswerIncorrect() {
    this.streak = 0;
    this.difficultyLevel = 1;
  }

  generateQuestion() {
    // Map difficultyLevel to a level number in LevelConfig
    let levelNum = 1;
    if (this.difficultyLevel === 1) levelNum = 1;
    else if (this.difficultyLevel === 2) levelNum = 2;
    else levelNum = 3;

    const correct = this.generateTime(levelNum);
    const choices = this.generateChoices(correct, levelNum, this.DEFAULT_CHOICE_COUNT);

    // find index of correct after shuffle
    const correctIndex = choices.findIndex(c => c.hours === correct.hours && c.minutes === correct.minutes);
    return { correct, choices, level: levelNum, correctIndex };
  }

  generateTime(level: number): ClockTime {
    const def = getLevelDef(level);
    const hours = Math.floor(this.rng() * 12) + 1;

    if (def.minuteStep >= 60) {
      return { hours, minutes: 0 };
    }

    const steps = 60 / def.minuteStep;
    const step = Math.floor(this.rng() * steps);
    return { hours, minutes: step * def.minuteStep };
  }

  generateUniqueTime(level: number, exclude: readonly ClockTime[]): ClockTime {
    // validate level
    const def = getLevelDef(level);
    const all = this.listAllCandidates(level);
    const remaining = all.filter(c => !this.equalsTimeList(c, exclude));

    if (remaining.length > 0) {
      const idx = Math.floor(this.rng() * remaining.length);
      return remaining[idx];
    }

    // Fallback: if all candidates are excluded, fall back to randomized attempts
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const time = this.generateTime(level);
      const dup = exclude.some(
        e => e.hours === time.hours && e.minutes === time.minutes,
      );
      if (!dup) return time;
    }

    // As a last resort, return any generated time (may be duplicate)
    return this.generateTime(level);
  }

  // Helper: list all possible candidate times for a level
  private listAllCandidates(level: number): ClockTime[] {
    const def = getLevelDef(level);
    const minutes: number[] = [];
    if (def.minuteStep >= 60) {
      minutes.push(0);
    } else {
      for (let m = 0; m < 60; m += def.minuteStep) minutes.push(m);
    }
    const candidates: ClockTime[] = [];
    for (let h = 1; h <= 12; h++) {
      for (const m of minutes) candidates.push({ hours: h, minutes: m });
    }
    return candidates;
  }

  // Helper: equality check for ClockTime
  private equalsTime(a: ClockTime, b: ClockTime): boolean {
    return a.hours === b.hours && a.minutes === b.minutes;
  }

  // Helper: checks if a time exists in a list
  private equalsTimeList(c: ClockTime, list: readonly ClockTime[]): boolean {
    return list.some(e => this.equalsTime(e, c));
  }

  // Helper: determines whether a wrong candidate is acceptable
  private isAcceptableCandidate(wrong: ClockTime, correct: ClockTime, def: ReturnType<typeof getLevelDef>, existing: ClockTime[]): boolean {
    if (wrong.hours === correct.hours && wrong.minutes === correct.minutes) return false;

    // Avoid too-similar choices for higher levels
    if (def.minuteStep <= 5) {
      const diffMin = Math.abs(
        (wrong.hours * 60 + wrong.minutes) - (correct.hours * 60 + correct.minutes),
      );
      const wrappedDiff = Math.min(diffMin, 720 - diffMin);
      if (wrappedDiff < def.minuteStep * 2 && wrappedDiff > 0) return false;
    }

    const dup = existing.some(c => c.hours === wrong.hours && c.minutes === wrong.minutes);
    if (dup) return false;

    return true;
  }

  // Validate a provided clock time against level definition
  private validateClockTimeOrThrow(time: ClockTime, level: number) {
    const def = getLevelDef(level);
    if (time.hours < 1 || time.hours > 12) throw new RangeError('hours out of range');
    if (time.minutes < 0 || time.minutes >= 60) throw new RangeError('minutes out of range');
    if (def.minuteStep < 60 && (time.minutes % def.minuteStep) !== 0) throw new RangeError('minutes not aligned to level step');
  }

  // Generate choices with stable count and guarantee correct inclusion
  generateChoices(correct: ClockTime, level: number, optionCount = this.DEFAULT_CHOICE_COUNT): ClockTime[] {
    // validate correct time
    this.validateClockTimeOrThrow(correct, level);

    const choices: ClockTime[] = [ { hours: correct.hours, minutes: correct.minutes } ];
    const def = getLevelDef(level);
    const maxAttempts = 200;
    let attempts = 0;

    while (choices.length < optionCount && attempts < maxAttempts) {
      attempts++;
      const wrong = this.generateTime(level);

      if (!this.isAcceptableCandidate(wrong, correct, def, choices)) {
        continue;
      }

      choices.push(wrong);
    }

    // If attempts exhausted and still not enough choices, fallback to enumerating candidates
    if (choices.length < optionCount) {
      const all = this.listAllCandidates(level).filter(c => this.isAcceptableCandidate(c, correct, def, choices));
      // Shuffle candidates for randomness
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      let idx = 0;
      while (choices.length < optionCount && idx < all.length) {
        choices.push(all[idx]);
        idx++;
      }

      // Second pass: ignore similarity if still not enough
      if (choices.length < optionCount) {
        const remaining = this.listAllCandidates(level).filter(
          c => !(c.hours === correct.hours && c.minutes === correct.minutes) &&
               !choices.some(e => e.hours === c.hours && e.minutes === c.minutes),
        );
        for (const cand of remaining) {
          if (choices.length >= optionCount) break;
          choices.push(cand);
        }
      }
    }

    // Ensure uniqueness: remove duplicates keeping first occurrence
    const unique: ClockTime[] = [];
    for (const c of choices) {
      if (!unique.some(u => u.hours === c.hours && u.minutes === c.minutes)) unique.push(c);
    }

    // If still less than required, pad deterministically from all candidates
    if (unique.length < optionCount) {
      const remainingAll = this.listAllCandidates(level).filter(
        c => !unique.some(u => u.hours === c.hours && u.minutes === c.minutes) &&
             !(c.hours === correct.hours && c.minutes === correct.minutes),
      );
      for (const cand of remainingAll) {
        if (unique.length >= optionCount) break;
        unique.push(cand);
      }
    }

    // Final shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    // Ensure correct is present exactly once; if missing, force insert at 0
    if (!unique.some(u => u.hours === correct.hours && u.minutes === correct.minutes)) {
      unique.unshift({ hours: correct.hours, minutes: correct.minutes });
      // trim to optionCount if over
      while (unique.length > optionCount) unique.pop();
    }

    // Trim/pad to exact optionCount
    if (unique.length > optionCount) unique.length = optionCount;
    while (unique.length < optionCount) unique.push({ hours: correct.hours, minutes: correct.minutes });

    return unique;
  }
}

export function formatTime(time: ClockTime): string {
  const h = time.hours;
  const m = time.minutes;
  if (m === 0) return `${h}時`;
  if (m === 30) return `${h}時半`;
  return `${h}時${m}分`;
}
