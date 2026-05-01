import { describe, it, expect, beforeEach } from 'vitest';
import { DailyProgress } from '@/ui/DailyProgress';
import type { DailyEvent } from '@/types';

describe('DailyProgress', () => {
  let dailyProgress: DailyProgress;
  let parent: HTMLDivElement;

  const sampleEvents: DailyEvent[] = [
    { id: '1', name: 'あさごはん', emoji: '🍚', time: { hours: 7, minutes: 0 } },
    { id: '2', name: 'がっこう', emoji: '🏫', time: { hours: 8, minutes: 30 } },
    { id: '3', name: 'おひるごはん', emoji: '🍱', time: { hours: 12, minutes: 0 } },
  ];

  beforeEach(() => {
    dailyProgress = new DailyProgress();
    parent = document.createElement('div');
  });

  it('should add a container to parent on mount', () => {
    dailyProgress.mount(parent);
    expect(parent.children.length).toBeGreaterThan(0);
  });

  it('should create dot elements matching event count via setEvents', () => {
    dailyProgress.mount(parent);
    dailyProgress.setEvents(sampleEvents, 1);
    const container = parent.firstElementChild!;
    expect(container.children.length).toBe(sampleEvents.length);
  });

  it('should remove DOM on unmount', () => {
    dailyProgress.mount(parent);
    dailyProgress.unmount();
    expect(parent.children.length).toBe(0);
  });
});
