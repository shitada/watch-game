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

  // completedLevels must be an object with arrays for each mode
  const cl = d.completedLevels;
  if (!cl || typeof cl !== 'object') return false;
  const modes = ['quiz', 'setTime', 'daily'] as const;
  for (const m of modes) {
    const arr = (cl as Record<string, unknown>)[m];
    if (!Array.isArray(arr)) return false;
    // ensure array contains only numbers
    if (!arr.every((v: unknown) => typeof v === 'number')) return false;
  }

  if (!Array.isArray(d.trophies)) return false;
  // ensure trophies array contains only strings
  if (!(d.trophies as unknown[]).every((v: unknown) => typeof v === 'string')) return false;
  if (typeof d.totalCorrect !== 'number' || typeof d.totalPlays !== 'number') return false;

  const bs = d.bestScores;
  if (!bs || typeof bs !== 'object' || Array.isArray(bs)) return false;
  // ensure bestScores values are numbers
  for (const k in bs as Record<string, unknown>) {
    if (typeof (bs as Record<string, unknown>)[k] !== 'number') return false;
  }

  return true;
}

export class SaveManager {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed: unknown = JSON.parse(raw);

      // Sanitize trophies before validation: keep only string elements when trophies is an array
      if (parsed && typeof parsed === 'object') {
        const p = parsed as Record<string, unknown>;
        if (Array.isArray(p.trophies)) {
          p.trophies = p.trophies.filter((v: unknown) => typeof v === 'string');
        } else {
          p.trophies = [];
        }
      }

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
