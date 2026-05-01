import { describe, it, expect, beforeEach } from 'vitest';
import { HUD } from '@/ui/HUD';

describe('HUD', () => {
  let hud: HUD;
  let parent: HTMLDivElement;

  beforeEach(() => {
    hud = new HUD();
    parent = document.createElement('div');
    hud.mount(parent);
  });

  it('should mount container with two span elements', () => {
    const spans = parent.querySelectorAll('span');
    expect(spans.length).toBe(2);
  });

  it('should set pointer-events to none on container', () => {
    const container = parent.querySelector('div')!;
    expect(container.style.pointerEvents).toBe('none');
  });

  it('should update question text', () => {
    hud.updateQuestion(3, 10);
    const spans = parent.querySelectorAll('span');
    expect(spans[0].textContent).toBe('もんだい 3/10');
  });

  it('should update score text', () => {
    hud.updateScore(5);
    const spans = parent.querySelectorAll('span');
    expect(spans[1].textContent).toBe('⭕ 5');
  });

  it('should clean up on unmount', () => {
    hud.unmount();
    expect(parent.querySelector('div')).toBeNull();
  });

  it('should not crash when calling updateQuestion after unmount', () => {
    hud.unmount();
    expect(() => hud.updateQuestion(1, 5)).not.toThrow();
  });

  it('should not crash when calling updateScore after unmount', () => {
    hud.unmount();
    expect(() => hud.updateScore(3)).not.toThrow();
  });
});
