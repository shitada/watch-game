import { describe, it, expect } from 'vitest';
import { TimeValidator } from '@/game/systems/TimeValidator';

describe('TimeValidator', () => {
  const validator = new TimeValidator();

  it('should validate exact match', () => {
    expect(
      validator.validate(
        { hours: 3, minutes: 0 },
        { hours: 3, minutes: 0 },
        15,
      ),
    ).toBe(true);
  });

  it('should validate within tolerance', () => {
    expect(
      validator.validate(
        { hours: 3, minutes: 0 },
        { hours: 3, minutes: 10 },
        15,
      ),
    ).toBe(true);
  });

  it('should reject outside tolerance', () => {
    expect(
      validator.validate(
        { hours: 3, minutes: 0 },
        { hours: 3, minutes: 20 },
        15,
      ),
    ).toBe(false);
  });

  it('should handle wrap-around (12:55 vs 1:05)', () => {
    // 12:55 = 775 min, 1:05 = 65 min, diff = 710, wrapped = 720 - 710 = 10
    expect(
      validator.validate(
        { hours: 12, minutes: 55 },
        { hours: 1, minutes: 5 },
        15,
      ),
    ).toBe(true);
  });

  it('should work with tight tolerance (1 minute)', () => {
    expect(
      validator.validate(
        { hours: 5, minutes: 23 },
        { hours: 5, minutes: 23 },
        1,
      ),
    ).toBe(true);

    expect(
      validator.validate(
        { hours: 5, minutes: 23 },
        { hours: 5, minutes: 25 },
        1,
      ),
    ).toBe(false);
  });
});
