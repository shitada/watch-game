import type { SaveData, GameMode } from '@/types';
import { migrations } from './saveMigrations';

const STORAGE_KEY = 'kids-clock-master-save';
export const currentVersion = 1;

function defaultData(): SaveData {
  return {
    version: currentVersion,
    completedLevels: { quiz: [], setTime: [], daily: [] },
    trophies: [],
    totalCorrect: 0,
    totalPlays: 0,
    bestScores: {},
    streak: 0,
  };
}

function isValid(data: unknown): data is SaveData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  // version must be a number and equal to currentVersion
  if (typeof d.version !== 'number') return false;

  // completedLevels must be an object with arrays for each mode
  const cl = d.completedLevels;
  if (!cl || typeof cl !== 'object') return false;
  const modes = ['quiz', 'setTime', 'daily'] as const;
  for (const m of modes) {
    const arr = (cl as Record<string, unknown>)[m];
    if (!Array.isArray(arr)) return false;
    // ensure array contains only numbers
    if (!(arr as unknown[]).every((v: unknown) => typeof v === 'number')) return false;
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

  // accept older saves missing streak, or ensure it's a number when present
  if ((d as Record<string, unknown>).streak !== undefined && typeof (d as Record<string, unknown>).streak !== 'number') return false;

  return true;
}

export function migrateIfNeeded(raw: unknown): SaveData {
  try {
    // determine source version (0 means no version)
    const srcVersion = raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).version === 'number'
      ? (raw as Record<string, unknown>).version as number
      : 0;

    let data: unknown = raw;
    for (let v = srcVersion + 1; v <= currentVersion; v++) {
      const fn = (migrations as Record<number, (r: unknown) => unknown>)[v];
      if (typeof fn !== 'function') {
        // missing migration path
        return defaultData();
      }
      data = fn(data);
    }

    // After migration, do defensive sanitization similar to previous behaviour
    if (data && typeof data === 'object') {
      const p = data as Record<string, unknown>;

      // trophies
      if (Array.isArray(p.trophies)) {
        p.trophies = p.trophies.filter((v: unknown) => typeof v === 'string');
      } else {
        p.trophies = [];
      }

      // completedLevels
      const cl = p.completedLevels;
      const modes = ['quiz', 'setTime', 'daily'] as const;
      if (cl && typeof cl === 'object') {
        for (const m of modes) {
          const arr = (cl as Record<string, unknown>)[m];
          if (Array.isArray(arr)) {
            (cl as Record<string, unknown>)[m] = (arr as unknown[])
              .map((v: unknown) => Number(v))
              .filter((n) => Number.isFinite(n));
          } else {
            (cl as Record<string, unknown>)[m] = [];
          }
        }
        p.completedLevels = cl;
      } else {
        p.completedLevels = { quiz: [], setTime: [], daily: [] };
      }

      // normalize bestScores
      if (!p.bestScores || typeof p.bestScores !== 'object' || Array.isArray(p.bestScores)) {
        p.bestScores = {};
      } else {
        const bs = p.bestScores as Record<string, unknown>;
        for (const k in bs) {
          const v = bs[k];
          bs[k] = typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
        }
        p.bestScores = bs;
      }

      // ensure numeric totals
      p.totalCorrect = typeof p.totalCorrect === 'number' && Number.isFinite(p.totalCorrect) ? p.totalCorrect : 0;
      p.totalPlays = typeof p.totalPlays === 'number' && Number.isFinite(p.totalPlays) ? p.totalPlays : 0;

      // ensure version present
      if (typeof p.version !== 'number') p.version = currentVersion;

      // ensure streak
      p.streak = typeof p.streak === 'number' && Number.isFinite(p.streak) ? p.streak : 0;
    }

    if (isValid(data)) return data as SaveData;
    return defaultData();
  } catch (e) {
    return defaultData();
  }
}

export class SaveManager {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed: unknown = JSON.parse(raw);

      const migrated = migrateIfNeeded(parsed);
      return migrated;
    } catch {
      return defaultData();
    }
  }

  save(data: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Fail silently but log for telemetry/diagnostics
      // eslint-disable-next-line no-console
      console.warn('SaveManager.save: failed to write to localStorage', e);
    }
  }

  addCompletedLevel(mode: GameMode, level: number): void {
    const data = this.load();
    const arr = data.completedLevels[mode];
    if (!arr.includes(level)) {
      arr.push(level);
      // 重複を排し、数値に正規化して昇順にソート
      data.completedLevels[mode] = Array.from(new Set(arr.map((v) => Number(v)))).sort((a, b) => a - b);
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('SaveManager.clear: failed to remove from localStorage', e);
    }
  }
}
