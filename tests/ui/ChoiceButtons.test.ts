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

  describe('eliminateChoices', () => {
    it('keepIndices に含まれないボタンが非活性化されること', () => {
      choiceButtons.setChoices(sampleChoices);
      choiceButtons.eliminateChoices([0, 2]);
      const buttons = parent.querySelectorAll('button');
      // index 1, 3 が非活性化
      expect(buttons[1].style.opacity).toBe('0.3');
      expect(buttons[1].style.pointerEvents).toBe('none');
      expect(buttons[1].disabled).toBe(true);
      expect(buttons[3].style.opacity).toBe('0.3');
      expect(buttons[3].style.pointerEvents).toBe('none');
      expect(buttons[3].disabled).toBe(true);
    });

    it('keepIndices に含まれるボタンはそのまま残ること', () => {
      choiceButtons.setChoices(sampleChoices);
      choiceButtons.eliminateChoices([0, 2]);
      const buttons = parent.querySelectorAll('button');
      expect(buttons[0].style.opacity).not.toBe('0.3');
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[2].style.opacity).not.toBe('0.3');
      expect(buttons[2].disabled).toBe(false);
    });

    it('非活性化ボタンの borderColor が変更されること', () => {
      choiceButtons.setChoices(sampleChoices);
      choiceButtons.eliminateChoices([1]);
      const buttons = parent.querySelectorAll('button');
      // jsdom は hex を rgb に変換するため rgb で比較
      expect(buttons[0].style.borderColor).toBe('rgb(189, 195, 199)');
      expect(buttons[2].style.borderColor).toBe('rgb(189, 195, 199)');
      expect(buttons[3].style.borderColor).toBe('rgb(189, 195, 199)');
    });
  });
});
