import { describe, it, expect } from 'vitest';
import { LEVELS, getLevelDef } from '@/game/config/LevelConfig';
import { DAILY_EVENTS } from '@/game/config/DailySchedule';

describe('LevelConfig', () => {
  it('should have 4 levels', () => {
    expect(LEVELS.length).toBe(4);
  });

  it('each level should have valid properties', () => {
    for (const level of LEVELS) {
      expect(level.level).toBeGreaterThanOrEqual(1);
      expect(level.level).toBeLessThanOrEqual(4);
      expect(level.minuteStep).toBeGreaterThan(0);
      expect(level.questionCount).toBeGreaterThan(0);
      expect(level.tolerance).toBeGreaterThan(0);
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
    }
  });

  it('getLevelDef should return correct level', () => {
    const l2 = getLevelDef(2);
    expect(l2.level).toBe(2);
    expect(l2.minuteStep).toBe(30);
  });

  it('getLevelDef should fallback for invalid level', () => {
    const l = getLevelDef(99);
    expect(l.level).toBe(1);
  });
});

describe('DailySchedule', () => {
  it('should have 8 events', () => {
    expect(DAILY_EVENTS.length).toBe(8);
  });

  it('each event should have valid time', () => {
    for (const event of DAILY_EVENTS) {
      expect(event.time.hours).toBeGreaterThanOrEqual(1);
      expect(event.time.hours).toBeLessThanOrEqual(12);
      expect(event.time.minutes).toBeGreaterThanOrEqual(0);
      expect(event.time.minutes).toBeLessThan(60);
      expect(event.name.length).toBeGreaterThan(0);
      expect(event.emoji.length).toBeGreaterThan(0);
      expect(event.id.length).toBeGreaterThan(0);
    }
  });
});
