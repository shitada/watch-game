import { describe, it, expect, vi, afterEach } from 'vitest';
import { QuizGenerator, formatTime } from '@/game/systems/QuizGenerator';

describe('QuizGenerator', () => {
  const gen = new QuizGenerator();

  it('should generate times within level 1 constraints (hours only)', () => {
    for (let i = 0; i < 20; i++) {
      const time = gen.generateTime(1);
      expect(time.hours).toBeGreaterThanOrEqual(1);
      expect(time.hours).toBeLessThanOrEqual(12);
      expect(time.minutes).toBe(0);
    }
  });

  it('should generate times within level 2 constraints (30-min steps)', () => {
    for (let i = 0; i < 20; i++) {
      const time = gen.generateTime(2);
      expect(time.hours).toBeGreaterThanOrEqual(1);
      expect(time.hours).toBeLessThanOrEqual(12);
      expect(time.minutes % 30).toBe(0);
    }
  });

  it('should generate times within level 3 constraints (5-min steps)', () => {
    for (let i = 0; i < 20; i++) {
      const time = gen.generateTime(3);
      expect(time.minutes % 5).toBe(0);
    }
  });

  it('should generate times within level 4 constraints (1-min steps)', () => {
    for (let i = 0; i < 20; i++) {
      const time = gen.generateTime(4);
      expect(time.minutes).toBeGreaterThanOrEqual(0);
      expect(time.minutes).toBeLessThan(60);
    }
  });

  it('should generate 4 unique choices', () => {
    const time = { hours: 3, minutes: 0 };
    const choices = gen.generateChoices(time, 1);

    expect(choices.length).toBe(4);

    // Check uniqueness
    const keys = choices.map(c => `${c.hours}:${c.minutes}`);
    expect(new Set(keys).size).toBe(4);

    // Check correct answer is included
    const hasCorrect = choices.some(
      c => c.hours === 3 && c.minutes === 0,
    );
    expect(hasCorrect).toBe(true);
  });
  it('should filter wrap-around close choices (correct=12:55, wrong=1:00)', () => {
    const gen2 = new QuizGenerator();
    const correct = { hours: 12, minutes: 55 };
    // Level 3: minuteStep=5, threshold = < 5*2 = < 10 min
    // 1:00 is 5 min away on clock face (wraps around 12) but 710 min by naive calc
    const candidates = [
      { hours: 1, minutes: 0 },   // 5 min on clock face - should be filtered
      { hours: 12, minutes: 50 }, // 5 min on clock face - should be filtered
      { hours: 6, minutes: 0 },   // far away - should pass
      { hours: 9, minutes: 30 },  // far away - should pass
      { hours: 3, minutes: 15 },  // far away - should pass
    ];
    let candidateIdx = 0;
    vi.spyOn(gen2, 'generateTime').mockImplementation(() => {
      const c = candidates[candidateIdx % candidates.length];
      candidateIdx++;
      return c;
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const choices = gen2.generateChoices(correct, 3);

    const hasWrapClose = choices.some(
      c => (c.hours === 1 && c.minutes === 0) ||
           (c.hours === 12 && c.minutes === 50),
    );
    expect(hasWrapClose).toBe(false);
    expect(choices.length).toBe(4);

    vi.restoreAllMocks();
  });

  it('should filter wrap-around close choices (correct=1:00, wrong=12:55)', () => {
    const gen2 = new QuizGenerator();
    const correct = { hours: 1, minutes: 0 };
    // 12:55 is 5 min away on clock face (wraps around 12) but 715 min by naive calc
    const candidates = [
      { hours: 12, minutes: 55 }, // 5 min on clock face - should be filtered
      { hours: 1, minutes: 5 },   // 5 min - not wrap-around, should be filtered by existing logic
      { hours: 6, minutes: 0 },
      { hours: 9, minutes: 30 },
      { hours: 3, minutes: 15 },
    ];
    let candidateIdx = 0;
    vi.spyOn(gen2, 'generateTime').mockImplementation(() => {
      const c = candidates[candidateIdx % candidates.length];
      candidateIdx++;
      return c;
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const choices = gen2.generateChoices(correct, 3);

    const hasWrapClose = choices.some(
      c => (c.hours === 12 && c.minutes === 55) ||
           (c.hours === 1 && c.minutes === 5),
    );
    expect(hasWrapClose).toBe(false);
    expect(choices.length).toBe(4);

    vi.restoreAllMocks();
  });
});

describe('generateUniqueTime', () => {
  it('should return a time not in exclude list', () => {
    const gen2 = new QuizGenerator();
    const exclude = [
      { hours: 3, minutes: 0 },
      { hours: 7, minutes: 0 },
    ];
    for (let i = 0; i < 30; i++) {
      const time = gen2.generateUniqueTime(1, exclude);
      const isDup = exclude.some(
        e => e.hours === time.hours && e.minutes === time.minutes,
      );
      expect(isDup).toBe(false);
    }
  });

  it('should generate all unique times for level 1 with 5 questions', () => {
    const gen2 = new QuizGenerator();
    const questions: { hours: number; minutes: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const time = gen2.generateUniqueTime(1, questions);
      const isDup = questions.some(
        q => q.hours === time.hours && q.minutes === time.minutes,
      );
      expect(isDup).toBe(false);
      questions.push(time);
    }
    expect(questions.length).toBe(5);
  });

  it('should not crash when exclude covers all candidates (fallback)', () => {
    const gen2 = new QuizGenerator();
    // Level 1: hours 1-12, minutes=0 → 12 candidates
    const allTimes = Array.from({ length: 12 }, (_, i) => ({
      hours: i + 1,
      minutes: 0,
    }));
    // Should not throw, returns fallback
    const time = gen2.generateUniqueTime(1, allTimes);
    expect(time).toHaveProperty('hours');
    expect(time).toHaveProperty('minutes');
  });
});

describe('formatTime', () => {
  it('should format exact hours', () => {
    expect(formatTime({ hours: 3, minutes: 0 })).toBe('3時');
  });

  it('should format half hours', () => {
    expect(formatTime({ hours: 7, minutes: 30 })).toBe('7時半');
  });

  it('should format other minutes', () => {
    expect(formatTime({ hours: 2, minutes: 15 })).toBe('2時15分');
  });
});

// Fallback-specific tests


describe('QuizGenerator fallback', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('should return 4 unique choices when generateTime repeatedly returns filtered candidates', () => {
    const gen = new QuizGenerator();
    const correct = { hours: 12, minutes: 55 };
    const candidates = [
      { hours: 1, minutes: 0 },
      { hours: 12, minutes: 50 },
    ];
    let idx = 0;
    vi.spyOn(gen, 'generateTime').mockImplementation(() => {
      const c = candidates[idx % candidates.length];
      idx++;
      return c;
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const choices = gen.generateChoices(correct, 3);
    expect(choices.length).toBe(4);
    const keys = choices.map(c => `${c.hours}:${c.minutes}`);
    expect(new Set(keys).size).toBe(4);
    const hasCorrect = choices.some(c => c.hours === 12 && c.minutes === 55);
    expect(hasCorrect).toBe(true);
  });
});
