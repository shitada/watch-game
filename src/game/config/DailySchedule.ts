import type { DailyEvent } from '@/types';

export const DAILY_EVENTS: DailyEvent[] = [
  { id: 'breakfast',  name: 'あさごはん',     emoji: '🍚', time: { hours: 7,  minutes: 0  } },
  { id: 'school',     name: 'がっこう',       emoji: '🏫', time: { hours: 8,  minutes: 30 } },
  { id: 'lunch',      name: 'きゅうしょく',   emoji: '🍱', time: { hours: 12, minutes: 0  } },
  { id: 'cleaning',   name: 'そうじ',         emoji: '🧹', time: { hours: 1,  minutes: 30 } },
  { id: 'homeroom',   name: 'かえりのかい',   emoji: '👋', time: { hours: 3,  minutes: 0  } },
  { id: 'snack',      name: 'おやつ',         emoji: '🍪', time: { hours: 3,  minutes: 30 } },
  { id: 'bath',       name: 'おふろ',         emoji: '🛁', time: { hours: 6,  minutes: 30 } },
  { id: 'bedtime',    name: 'ねるじかん',     emoji: '🌙', time: { hours: 9,  minutes: 0  } },
];
