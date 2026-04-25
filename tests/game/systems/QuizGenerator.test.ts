import { describe, it, expect } from 'vitest';
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
