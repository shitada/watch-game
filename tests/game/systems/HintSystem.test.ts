import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuizGenerator } from '@/game/systems/QuizGenerator';
import { HintSystem } from '@/game/systems/HintSystem';
import type { ClockTime } from '@/types';

describe('HintSystem', () => {
  let qg: QuizGenerator;
  let clock: any;
  let hintCard: any;
  let hs: HintSystem;
  const target: ClockTime = { hours: 3, minutes: 30 };

  beforeEach(() => {
    qg = new QuizGenerator(() => 0.5);
    qg.startQuestion();
    clock = { animateTo: vi.fn().mockResolvedValue(undefined) };
    hintCard = { highlightNumber: vi.fn(), clearHighlight: vi.fn() };
    hs = new HintSystem(qg, clock, hintCard);
  });

  it('provides hint: highlights number, animates clock, and marks hint used', async () => {
    await hs.provideHint(target);
    expect(hintCard.highlightNumber).toHaveBeenCalledWith(3);
    expect(clock.animateTo).toHaveBeenCalledWith(target);
    expect(qg.canUseHint()).toBe(false);
    expect(hintCard.clearHighlight).toHaveBeenCalled();
  });

  it('does nothing if hint already used', async () => {
    qg.useHint();
    await hs.provideHint(target);
    expect(clock.animateTo).not.toHaveBeenCalled();
    expect(hintCard.highlightNumber).not.toHaveBeenCalled();
  });

  it('marks hint used and clears highlight even if clock.animateTo rejects', async () => {
    // simulate animateTo failure
    clock.animateTo = vi.fn().mockRejectedValue(new Error('animate failed'));

    await hs.provideHint(target);

    // even though animateTo failed, hint should be consumed
    expect(qg.canUseHint()).toBe(false);
    // and UI highlight should be cleared
    expect(hintCard.clearHighlight).toHaveBeenCalled();
  });
});
