import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '@/game/storage/SaveManager';

describe('SaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default data when no save exists', () => {
    const sm = new SaveManager();
    const data = sm.load();

    expect(data.totalPlays).toBe(0);
    expect(data.totalCorrect).toBe(0);
    expect(data.trophies).toEqual([]);
    expect(data.completedLevels.quiz).toEqual([]);
  });

  it('should save and load data', () => {
    const sm = new SaveManager();
    const data = sm.load();
    data.totalPlays = 5;
    data.totalCorrect = 20;
    sm.save(data);

    const loaded = sm.load();
    expect(loaded.totalPlays).toBe(5);
    expect(loaded.totalCorrect).toBe(20);
  });

  it('should add completed level without duplicates', () => {
    const sm = new SaveManager();
    sm.addCompletedLevel('quiz', 1);
    sm.addCompletedLevel('quiz', 1);
    sm.addCompletedLevel('quiz', 2);

    const data = sm.load();
    expect(data.completedLevels.quiz).toEqual([1, 2]);
  });

  it('should keep completed levels sorted', () => {
    const sm = new SaveManager();
    sm.addCompletedLevel('quiz', 10);
    sm.addCompletedLevel('quiz', 2);
    sm.addCompletedLevel('quiz', 5);

    const data = sm.load();
    expect(data.completedLevels.quiz).toEqual([2, 5, 10]);
  });

  it('should add trophies without duplicates', () => {
    const sm = new SaveManager();
    sm.addTrophy('quiz-1-perfect');
    sm.addTrophy('quiz-1-perfect');

    const data = sm.load();
    expect(data.trophies).toEqual(['quiz-1-perfect']);
  });

  it('should sanitize trophies array elements when loading', () => {
    const corrupted = {
      trophies: ['ok', 123],
      completedLevels: { quiz: [], setTime: [], daily: [] },
      totalCorrect: 0,
      totalPlays: 0,
      bestScores: {},
    };
    localStorage.setItem('kids-clock-master-save', JSON.stringify(corrupted));

    const sm = new SaveManager();
    const data = sm.load();
    expect(data.trophies).toEqual(['ok']);
  });

  it('should sanitize completedLevels elements when loading (string numbers -> numbers)', () => {
    const corrupted = {
      trophies: [],
      completedLevels: { quiz: ['1', '2'], setTime: [], daily: [] },
      totalCorrect: 0,
      totalPlays: 0,
      bestScores: {},
    };
    localStorage.setItem('kids-clock-master-save', JSON.stringify(corrupted));

    const sm = new SaveManager();
    const data = sm.load();
    expect(data.completedLevels.quiz).toEqual([1, 2]);
  });

  it('should update best score only if higher', () => {
    const sm = new SaveManager();
    sm.updateBestScore('quiz-1', 3);
    sm.updateBestScore('quiz-1', 2);
    sm.updateBestScore('quiz-1', 5);

    const data = sm.load();
    expect(data.bestScores['quiz-1']).toBe(5);
  });

  it('should increment stats', () => {
    const sm = new SaveManager();
    sm.incrementStats(3);
    sm.incrementStats(5);

    const data = sm.load();
    expect(data.totalPlays).toBe(2);
    expect(data.totalCorrect).toBe(8);
  });

  it('should clear data', () => {
    const sm = new SaveManager();
    sm.addTrophy('test');
    sm.clear();

    const data = sm.load();
    expect(data.trophies).toEqual([]);
  });

  it('should handle corrupted data gracefully (non-json)', () => {
    localStorage.setItem('kids-clock-master-save', 'not-json');
    const sm = new SaveManager();
    const data = sm.load();

    expect(data.totalPlays).toBe(0);
  });

  it('should fallback to default for structurally corrupted data and allow recovery', () => {
    // completedLevels is null and other fields are wrong types
    const corrupted = {
      completedLevels: null,
      trophies: null,
      totalCorrect: 'NaN',
      totalPlays: null,
      bestScores: null,
    };
    localStorage.setItem('kids-clock-master-save', JSON.stringify(corrupted));

    const sm = new SaveManager();
    const data = sm.load();

    // should return default structure, not the corrupted one
    expect(data.completedLevels.quiz).toEqual([]);
    expect(data.trophies).toEqual([]);
    expect(data.totalPlays).toBe(0);

    // should be able to add completed level without throwing
    expect(() => sm.addCompletedLevel('quiz', 3)).not.toThrow();
    const after = sm.load();
    expect(after.completedLevels.quiz).toContain(3);
  });

  it('should not throw when localStorage.setItem throws', () => {
    const sm = new SaveManager();
    const originalSet = localStorage.setItem;
    try {
      // mock setItem to throw
      // @ts-ignore
      localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

      // operations that trigger save should not throw
      expect(() => sm.addTrophy('x')).not.toThrow();
      expect(() => sm.addCompletedLevel('quiz', 1)).not.toThrow();

      // calling save directly should also not throw
      const data = sm.load();
      expect(() => sm.save(data)).not.toThrow();
    } finally {
      localStorage.setItem = originalSet;
    }
  });

  it('should not throw when localStorage.removeItem throws', () => {
    const sm = new SaveManager();
    const originalRemove = localStorage.removeItem;
    try {
      // mock removeItem to throw
      // @ts-ignore
      localStorage.removeItem = () => { throw new Error('SomeError'); };

      expect(() => sm.clear()).not.toThrow();
    } finally {
      localStorage.removeItem = originalRemove;
    }
  });

  // Migration tests
  it('should migrate v0 (no version) data to v1', () => {
    const rawV0 = {
      trophies: ['ok', 123],
      completedLevels: { quiz: ['1', '2'], setTime: [], daily: [] },
      totalCorrect: 4,
      totalPlays: 2,
      bestScores: { 'quiz-1': '3' },
    };
    localStorage.setItem('kids-clock-master-save', JSON.stringify(rawV0));

    const sm = new SaveManager();
    const data = sm.load();

    expect(data.version).toBe(1);
    expect(data.completedLevels.quiz).toEqual([1, 2]);
    expect(data.trophies).toEqual(['ok']);
    expect(data.bestScores['quiz-1']).toBe(3);
  });

  it('should accept valid v1 data as-is', () => {
    const validV1 = {
      version: 1,
      trophies: ['x'],
      completedLevels: { quiz: [1], setTime: [], daily: [] },
      totalCorrect: 1,
      totalPlays: 1,
      bestScores: { 'quiz-1': 1 },
      streak: 2,
    };
    localStorage.setItem('kids-clock-master-save', JSON.stringify(validV1));

    const sm = new SaveManager();
    const data = sm.load();
    expect(data.version).toBe(1);
    expect(data.trophies).toEqual(['x']);
  });

  it('should fallback to default if migrated data is invalid', () => {
    const bad = {
      version: 1,
      trophies: null,
      completedLevels: null,
      totalCorrect: 'NaN',
      totalPlays: null,
      bestScores: null,
    };
    localStorage.setItem('kids-clock-master-save', JSON.stringify(bad));

    const sm = new SaveManager();
    const data = sm.load();
    expect(data.totalPlays).toBe(0);
    expect(data.completedLevels.quiz).toEqual([]);
  });
});
