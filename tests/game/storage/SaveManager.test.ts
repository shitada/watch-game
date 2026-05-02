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
});
