import { describe, it, expect, beforeEach } from 'vitest';
import { QuizGenerator } from '@/game/systems/QuizGenerator';

describe('QuizGenerator hint state', () => {
  let qg: QuizGenerator;
  beforeEach(() => {
    qg = new QuizGenerator(() => 0.5);
  });

  it('startQuestion() でヒントがリセットされ、canUseHint() が true になる', () => {
    qg.startQuestion();
    expect(qg.canUseHint()).toBe(true);
  });

  it('useHint() を呼ぶと canUseHint() が false になり remainingHints() が 0 になる', () => {
    qg.startQuestion();
    qg.useHint();
    expect(qg.canUseHint()).toBe(false);
    expect(qg.remainingHints()).toBe(0);
  });

  it('startQuestion() は次の問題でヒントを再び有効にする', () => {
    qg.startQuestion();
    qg.useHint();
    qg.startQuestion();
    expect(qg.canUseHint()).toBe(true);
    expect(qg.remainingHints()).toBe(1);
  });
});
