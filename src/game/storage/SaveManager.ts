import type { SaveData, GameMode } from '@/types';

const STORAGE_KEY = 'kids-clock-master-save';

function defaultData(): SaveData {
  return {
    completedLevels: { quiz: [], setTime: [], daily: [] },
    trophies: [],
    totalCorrect: 0,
    totalPlays: 0,
    bestScores: {},
  };
}

function isValid(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.completedLevels === 'object' &&
    Array.isArray(d.trophies) &&
    typeof d.totalCorrect === 'number' &&
    typeof d.totalPlays === 'number' &&
    typeof d.bestScores === 'object'
  );
}

export class SaveManager {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) return parsed;
      return defaultData();
    } catch {
      return defaultData();
    }
  }

  save(data: SaveData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  addCompletedLevel(mode: GameMode, level: number): void {
    const data = this.load();
    if (!data.completedLevels[mode].includes(level)) {
      data.completedLevels[mode].push(level);
    }
    this.save(data);
  }

  addTrophy(trophyId: string): void {
    const data = this.load();
    if (!data.trophies.includes(trophyId)) {
      data.trophies.push(trophyId);
    }
    this.save(data);
  }

  updateBestScore(key: string, correct: number): void {
    const data = this.load();
    const prev = data.bestScores[key] ?? 0;
    if (correct > prev) {
      data.bestScores[key] = correct;
    }
    this.save(data);
  }

  incrementStats(correct: number): void {
    const data = this.load();
    data.totalCorrect += correct;
    data.totalPlays++;
    this.save(data);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
