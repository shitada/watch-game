import { describe, it, expect, beforeEach } from 'vitest';
import { DailyProgress } from '@/ui/DailyProgress';
import type { DailyEvent } from '@/types';

describe('DailyProgress', () => {
  let dailyProgress: DailyProgress;
  let parent: HTMLDivElement;

  const sampleEvents: DailyEvent[] = [
    { id: 'wake', name: 'おきる', emoji: '☀️', time: { hours: 7, minutes: 0 } },
    { id: 'school', name: 'がっこう', emoji: '🏫', time: { hours: 8, minutes: 30 } },
    { id: 'lunch', name: 'おひる', emoji: '🍱', time: { hours: 12, minutes: 0 } },
    { id: 'play', name: 'あそぶ', emoji: '⚽', time: { hours: 15, minutes: 0 } },
  ];

  beforeEach(() => {
    dailyProgress = new DailyProgress();
    parent = document.createElement('div');
    dailyProgress.mount(parent);
  });

  it('should mount container element', () => {
    expect(parent.querySelector('div')).not.toBeNull();
  });

  it('should render dots for each event', () => {
    dailyProgress.setEvents(sampleEvents, 0);
    const dots = parent.querySelectorAll('div div');
    expect(dots.length).toBe(sampleEvents.length);
  });

  it('should show emoji for upcoming events', () => {
    dailyProgress.setEvents(sampleEvents, 1);
    const dots = parent.querySelectorAll('div div');
    // index 1 is current, index 2 and 3 are upcoming
    expect(dots[2].textContent).toBe('🍱');
    expect(dots[3].textContent).toBe('⚽');
  });

  it('should show checkmark for completed events', () => {
    dailyProgress.setEvents(sampleEvents, 2);
    const dots = parent.querySelectorAll('div div');
    expect(dots[0].textContent).toBe('✅');
    expect(dots[1].textContent).toBe('✅');
  });

  it('should highlight current event with blue background', () => {
    dailyProgress.setEvents(sampleEvents, 1);
    const dots = parent.querySelectorAll('div div');
    expect(dots[1].style.background).toContain('3498DB');
  });

  it('should highlight completed events with green background', () => {
    dailyProgress.setEvents(sampleEvents, 2);
    const dots = parent.querySelectorAll('div div');
    expect(dots[0].style.background).toContain('2ECC71');
  });

  it('should update dots when setEvents is called again', () => {
    dailyProgress.setEvents(sampleEvents, 0);
    dailyProgress.setEvents(sampleEvents, 3);
    const dots = parent.querySelectorAll('div div');
    expect(dots.length).toBe(sampleEvents.length);
    // First 3 should be completed
    expect(dots[0].textContent).toBe('✅');
    expect(dots[1].textContent).toBe('✅');
    expect(dots[2].textContent).toBe('✅');
  });

  it('should clean up on unmount', () => {
    dailyProgress.setEvents(sampleEvents, 0);
    dailyProgress.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('should not crash when calling setEvents after unmount', () => {
    dailyProgress.unmount();
    expect(() => dailyProgress.setEvents(sampleEvents, 0)).not.toThrow();
  });
});
