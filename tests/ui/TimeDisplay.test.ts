import { describe, it, expect, beforeEach } from 'vitest';
import { TimeDisplay } from '@/ui/TimeDisplay';

describe('TimeDisplay', () => {
  let timeDisplay: TimeDisplay;
  let parent: HTMLDivElement;

  beforeEach(() => {
    timeDisplay = new TimeDisplay();
    parent = document.createElement('div');
  });

  it('should add elements to parent on mount', () => {
    timeDisplay.mount(parent);
    expect(parent.children.length).toBeGreaterThan(0);
  });

  it('should update time text via setTime', () => {
    timeDisplay.mount(parent);
    timeDisplay.setTime({ hours: 3, minutes: 30 });
    expect(parent.textContent).not.toBe('');
  });

  it('should remove DOM on unmount', () => {
    timeDisplay.mount(parent);
    timeDisplay.unmount();
    expect(parent.children.length).toBe(0);
  });
});
