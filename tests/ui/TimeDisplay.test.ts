import { describe, it, expect, beforeEach } from 'vitest';
import { TimeDisplay } from '@/ui/TimeDisplay';
import { formatTime } from '@/game/systems/QuizGenerator';
import type { ClockTime } from '@/types';

describe('TimeDisplay', () => {
  let timeDisplay: TimeDisplay;
  let parent: HTMLDivElement;

  beforeEach(() => {
    timeDisplay = new TimeDisplay();
    parent = document.createElement('div');
  });

  it('mount() で親要素に DOM が追加されること', () => {
    timeDisplay.mount(parent);
    expect(parent.children.length).toBe(1);
  });

  it('ラベルテキストが表示されること', () => {
    timeDisplay.mount(parent);
    const label = parent.querySelector('div div') as HTMLElement;
    expect(label.textContent).toBe('この じかん に あわせよう！');
  });

  it('setTime() で時刻が正しく表示されること', () => {
    timeDisplay.mount(parent);
    const time: ClockTime = { hours: 3, minutes: 0 };
    timeDisplay.setTime(time);
    const span = parent.querySelector('span')!;
    expect(span.textContent).toBe(formatTime(time));
  });

  it('unmount() で DOM が除去されること', () => {
    timeDisplay.mount(parent);
    timeDisplay.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('unmount() 後に setTime() を呼んでもエラーにならないこと', () => {
    timeDisplay.mount(parent);
    timeDisplay.unmount();
    expect(() => {
      timeDisplay.setTime({ hours: 6, minutes: 30 });
    }).not.toThrow();
  });
});
