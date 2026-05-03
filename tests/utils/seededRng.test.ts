import { describe, it, expect } from 'vitest';
import { createSeededRng } from '@/utils/seededRng';

describe('createSeededRng', () => {
  it('generates same sequence for same seed', () => {
    const a = createSeededRng(123);
    const b = createSeededRng(123);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('generates different sequence for different seeds', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});
