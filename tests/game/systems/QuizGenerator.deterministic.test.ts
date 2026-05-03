import { describe, it, expect } from 'vitest';
import { QuizGenerator } from '@/game/systems/QuizGenerator';
import { createSeededRng } from '@/utils/seededRng';

describe('QuizGenerator deterministic', () => {
  it('produces reproducible question and choices for same seed', () => {
    const rng1 = createSeededRng(12345);
    const gen1 = new QuizGenerator(rng1);
    const q1 = gen1.generateQuestion();

    const rng2 = createSeededRng(12345);
    const gen2 = new QuizGenerator(rng2);
    const q2 = gen2.generateQuestion();

    expect(q1.correct).toEqual(q2.correct);
    expect(q1.choices).toEqual(q2.choices);
    expect(q1.correctIndex).toBe(q2.correctIndex);
  });
});
