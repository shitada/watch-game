import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChoiceButtons } from '@/ui/ChoiceButtons';
import type { ClockTime } from '@/types';

describe('ChoiceButtons', () => {
  let parent: HTMLElement;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    parent.remove();
  });

  it('showHint dims two incorrect buttons deterministically with injected rng', () => {
    // rng that returns 0, then 0.5, then repeats (never returns 1.0)
    let calls = 0;
    const rng = () => {
      const v = calls % 2 === 0 ? 0 : 0.5;
      calls++;
      return v;
    };

    const cb = new ChoiceButtons(rng);
    cb.mount(parent);

    const choices: ClockTime[] = [
      { hours: 1, minutes: 0 },
      { hours: 2, minutes: 0 },
      { hours: 3, minutes: 0 },
      { hours: 4, minutes: 0 },
    ];

    cb.setChoices(choices);

    // sanity checks
    const buttons = parent.querySelectorAll('button');
    expect(buttons.length).toBe(4);

    // correct index is 0, so incorrectIndices = [1,2,3]
    cb.showHint(0);

    // With our rng (0 then 1) the shuffle will produce toDim = [3,2]
    const btn1 = buttons[1] as HTMLButtonElement;
    const btn2 = buttons[2] as HTMLButtonElement;
    const btn3 = buttons[3] as HTMLButtonElement;

    expect(btn1.style.opacity).toBe(''); // untouched
    expect(btn2.style.opacity).toBe('0.3');
    expect(btn2.style.pointerEvents).toBe('none');
    expect(btn3.style.opacity).toBe('0.3');
    expect(btn3.style.pointerEvents).toBe('none');

    // ARIA labels and min-height
    expect(btn1.getAttribute('aria-label')).toBe('2時');
    expect(btn1.style.minHeight).toBe('64px');

    cb.unmount();
  });
});
