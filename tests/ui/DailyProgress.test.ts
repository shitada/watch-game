import { describe, it, expect, beforeEach } from 'vitest';
import { DailyProgress } from '@/ui/DailyProgress';
import type { DailyEvent } from '@/types';

describe('DailyProgress', () => {
  let dailyProgress: DailyProgress;
  let parent: HTMLDivElement;

  const sampleEvents: DailyEvent[] = [
    { id: 'wake', name: 'おきる', emoji: '☀️', time: { hours: 7, minutes: 0 } },
    { id: 'school', name: 'がっこう', emoji: '🏫', time: { hours: 8, minutes: 30 } },
    { id: 'lunch', name: 'おひるごはん', emoji: '🍱', time: { hours: 12, minutes: 0 } },
    { id: 'play', name: 'あそぶ', emoji: '⚽', time: { hours: 3, minutes: 0 } },
  ];

  beforeEach(() => {
    dailyProgress = new DailyProgress();
    parent = document.createElement('div');
  });

  it('mount() で親要素にコンテナが追加されること', () => {
    dailyProgress.mount(parent);
    expect(parent.children.length).toBe(1);
  });

  it('setEvents() でドットが生成されること', () => {
    dailyProgress.mount(parent);
    dailyProgress.setEvents(sampleEvents, 1);
    const container = parent.children[0];
    expect(container.children.length).toBe(4);
  });

  it('現在のイベントのドットがハイライトされること', () => {
    dailyProgress.mount(parent);
    dailyProgress.setEvents(sampleEvents, 1);
    const currentDot = parent.children[0].children[1] as HTMLElement;
    expect(currentDot.style.background).toBe('rgb(52, 152, 219)');
  });

  it('完了済みイベントのドットに「✅」が表示されること', () => {
    dailyProgress.mount(parent);
    dailyProgress.setEvents(sampleEvents, 2);
    const doneDot0 = parent.children[0].children[0] as HTMLElement;
    const doneDot1 = parent.children[0].children[1] as HTMLElement;
    expect(doneDot0.textContent).toBe('✅');
    expect(doneDot1.textContent).toBe('✅');
  });

  it('未到達イベントのドットに emoji が表示されること', () => {
    dailyProgress.mount(parent);
    dailyProgress.setEvents(sampleEvents, 1);
    const futureDot = parent.children[0].children[2] as HTMLElement;
    expect(futureDot.textContent).toBe('🍱');
  });

  it('unmount() で DOM が除去されること', () => {
    dailyProgress.mount(parent);
    dailyProgress.unmount();
    expect(parent.children.length).toBe(0);
  });
});
