import { describe, it, expect, beforeEach } from 'vitest';
import { ChoiceButtons } from '@/ui/ChoiceButtons';
import type { ClockTime } from '@/types';

describe('ChoiceButtons', () => {
  let choiceButtons: ChoiceButtons;
  let parent: HTMLDivElement;

  beforeEach(() => {
    choiceButtons = new ChoiceButtons();
    parent = document.createElement('div');
    choiceButtons.mount(parent);
  });

  const sampleChoices: ClockTime[] = [
    { hours: 3, minutes: 0 },
    { hours: 6, minutes: 30 },
    { hours: 9, minutes: 15 },
    { hours: 12, minutes: 45 },
  ];

  it('should render buttons for each choice', () => {
    choiceButtons.setChoices(sampleChoices);
    const buttons = parent.querySelectorAll('button');
    expect(buttons.length).toBe(4);
  });

  it('should scale down on pointerdown', () => {
    choiceButtons.setChoices(sampleChoices);
    const btn = parent.querySelector('button')!;
    btn.dispatchEvent(new Event('pointerdown'));
    expect(btn.style.transform).toBe('scale(0.95)');
  });

  it('should reset scale on pointerup', () => {
    choiceButtons.setChoices(sampleChoices);
    const btn = parent.querySelector('button')!;
    btn.dispatchEvent(new Event('pointerdown'));
    btn.dispatchEvent(new Event('pointerup'));
    expect(btn.style.transform).toBe('scale(1)');
  });

  it('should reset scale on pointerleave', () => {
    choiceButtons.setChoices(sampleChoices);
    const btn = parent.querySelector('button')!;
    btn.dispatchEvent(new Event('pointerdown'));
    expect(btn.style.transform).toBe('scale(0.95)');
    btn.dispatchEvent(new Event('pointerleave'));
    expect(btn.style.transform).toBe('scale(1)');
  });

  it('should call onSelect callback when clicked', () => {
    choiceButtons.setChoices(sampleChoices);
    let selectedIndex = -1;
    choiceButtons.onSelect((i) => { selectedIndex = i; });
    const buttons = parent.querySelectorAll('button');
    buttons[2].dispatchEvent(new Event('click'));
    expect(selectedIndex).toBe(2);
  });

  it('should not call onSelect when disabled after showResult', () => {
    choiceButtons.setChoices(sampleChoices);
    let selectedIndex = -1;
    choiceButtons.onSelect((i) => { selectedIndex = i; });
    choiceButtons.showResult(0, 1);
    const buttons = parent.querySelectorAll('button');
    buttons[0].dispatchEvent(new Event('click'));
    expect(selectedIndex).toBe(-1);
  });

  it('should not scale down on pointerdown when disabled', () => {
    choiceButtons.setChoices(sampleChoices);
    choiceButtons.showResult(0, 1);
    const btn = parent.querySelector('button')!;
    btn.dispatchEvent(new Event('pointerdown'));
    expect(btn.style.transform).not.toBe('scale(0.95)');
  });

  it('should reset scale on pointerleave even when disabled', () => {
    choiceButtons.setChoices(sampleChoices);
    const btn = parent.querySelector('button')!;
    btn.dispatchEvent(new Event('pointerdown'));
    expect(btn.style.transform).toBe('scale(0.95)');
    choiceButtons.showResult(0, 1);
    btn.dispatchEvent(new Event('pointerleave'));
    expect(btn.style.transform).toBe('scale(1)');
  });

  it('should clean up on unmount', () => {
    choiceButtons.setChoices(sampleChoices);
    choiceButtons.unmount();
    expect(parent.querySelector('div')).toBeNull();
  });
});
