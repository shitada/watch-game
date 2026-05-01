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
    timeDisplay.mount(parent);
  });

  it('should mount container with label and time element', () => {
    const divs = parent.querySelectorAll('div');
    expect(divs.length).toBeGreaterThanOrEqual(1);
    const spans = parent.querySelectorAll('span');
    expect(spans.length).toBe(1);
  });

  it('should display instruction label', () => {
    const label = parent.querySelector('div div')!;
    expect(label.textContent).toBe('この じかん に あわせよう！');
  });

  it('should set time using formatTime', () => {
    const time: ClockTime = { hours: 3, minutes: 0 };
    timeDisplay.setTime(time);
    const span = parent.querySelector('span')!;
    expect(span.textContent).toBe(formatTime(time));
  });

  it('should set time with minutes', () => {
    const time: ClockTime = { hours: 7, minutes: 15 };
    timeDisplay.setTime(time);
    const span = parent.querySelector('span')!;
    expect(span.textContent).toBe(formatTime(time));
  });

  it('should set time with half hour', () => {
    const time: ClockTime = { hours: 12, minutes: 30 };
    timeDisplay.setTime(time);
    const span = parent.querySelector('span')!;
    expect(span.textContent).toBe(formatTime(time));
  });

  it('should clean up on unmount', () => {
    timeDisplay.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('should not crash when calling setTime after unmount', () => {
    timeDisplay.unmount();
    expect(() => timeDisplay.setTime({ hours: 1, minutes: 0 })).not.toThrow();
  });
});
