import type { LevelDefinition } from '@/types';

export const LEVELS: LevelDefinition[] = [
  {
    level: 1,
    name: 'レベル１',
    description: '〜じ（ちょうどのじかん）',
    minuteStep: 60,
    questionCount: 5,
    tolerance: 15,
  },
  {
    level: 2,
    name: 'レベル２',
    description: '〜じはん（30ぷんたんい）',
    minuteStep: 30,
    questionCount: 5,
    tolerance: 10,
  },
  {
    level: 3,
    name: 'レベル３',
    description: '〜じ〜ふん（5ふんたんい）',
    minuteStep: 5,
    questionCount: 8,
    tolerance: 3,
  },
  {
    level: 4,
    name: 'レベル４',
    description: '〜じ〜ぷん（1ぷんたんい）',
    minuteStep: 1,
    questionCount: 10,
    tolerance: 1,
  },
];

export function getLevelDef(level: number): LevelDefinition {
  return LEVELS[level - 1] ?? LEVELS[0];
}
