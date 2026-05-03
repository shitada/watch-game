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

  it('showHint dims two incorrect buttons deterministically with injected rng and updates live region and showResult behavior', () => {
    // Deterministic RNG that alternates 0 and 0.5
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

    // Ensure live region exists and is empty initially
    const live = parent.querySelector('[aria-live]') as HTMLElement | null;
    expect(live).toBeTruthy();
    expect(live!.textContent).toBe('');

    // correct index is 0
    cb.showHint(0);

    // Two incorrect buttons should be dimmed and non-interactive
    const dimmed = Array.from(buttons).filter(b => b.style.opacity === '0.3');
    expect(dimmed.length).toBe(2);
    dimmed.forEach(b => expect(b.style.pointerEvents).toBe('none'));

    // Correct button must not be dimmed
    expect(buttons[0].style.opacity).not.toBe('0.3');

    // Live region should announce hint usage
    expect(live!.textContent).toBe('ヒントを使ったよ');

    // Now test showResult: pick correctIndex=0, selectedIndex=2 (wrong selection)
    cb.showResult(0, 2);

    // After showResult, all buttons should be disabled and not interactive
    const buttonsAfter = parent.querySelectorAll('button');
    buttonsAfter.forEach(b => {
      expect((b as HTMLButtonElement).disabled).toBe(true);
      expect(b.style.pointerEvents).toBe('none');
    });

    // Non-correct, non-selected buttons should have opacity 0.5
    // indexes: 0 correct, 2 selected wrong, so index 1 and 3 should be 0.5
    expect((buttonsAfter[1] as HTMLButtonElement).style.opacity).toBe('0.5');
    expect((buttonsAfter[3] as HTMLButtonElement).style.opacity).toBe('0.5');

    // Selected wrong button should have been styled as incorrect (text color set to white)
    const selColor = (buttonsAfter[2] as HTMLButtonElement).style.color;
    expect(selColor === '#fff' || selColor === 'rgb(255, 255, 255)').toBe(true);

    cb.unmount();
  });
});
