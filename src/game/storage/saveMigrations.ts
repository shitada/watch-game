// Migration functions map. Each key is the target version number and the function
// should accept the previous-version data and return data shaped for the target version.

export type MigrationFn = (raw: unknown) => unknown;

export const migrations: Record<number, MigrationFn> = {
  // v1: migrate from v0 (no version) -> v1
  1: (raw: unknown) => {
    const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    const completedLevels = {
      quiz: Array.isArray(p.completedLevels && (p.completedLevels as Record<string, unknown>).quiz)
        ? ((p.completedLevels as Record<string, unknown>).quiz as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [],
      setTime: Array.isArray(p.completedLevels && (p.completedLevels as Record<string, unknown>).setTime)
        ? ((p.completedLevels as Record<string, unknown>).setTime as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [],
      daily: Array.isArray(p.completedLevels && (p.completedLevels as Record<string, unknown>).daily)
        ? ((p.completedLevels as Record<string, unknown>).daily as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [],
    };

    const trophies = Array.isArray(p.trophies) ? (p.trophies as unknown[]).filter((v) => typeof v === 'string') : [];

    const totalCorrect = typeof p.totalCorrect === 'number' && Number.isFinite(p.totalCorrect) ? p.totalCorrect as number : 0;
    const totalPlays = typeof p.totalPlays === 'number' && Number.isFinite(p.totalPlays) ? p.totalPlays as number : 0;

    const bestScores: Record<string, number> = {};
    if (p.bestScores && typeof p.bestScores === 'object' && !Array.isArray(p.bestScores)) {
      for (const k in p.bestScores as Record<string, unknown>) {
        const v = (p.bestScores as Record<string, unknown>)[k];
        bestScores[k] = typeof v === 'number' && Number.isFinite(v) ? (v as number) : Number(v as any) || 0;
      }
    }

    const streak = typeof p.streak === 'number' && Number.isFinite(p.streak) ? (p.streak as number) : 0;

    return {
      version: 1,
      completedLevels,
      trophies,
      totalCorrect,
      totalPlays,
      bestScores,
      streak,
    };
  },
};
