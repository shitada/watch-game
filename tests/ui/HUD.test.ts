import { describe, it, expect, beforeEach } from 'vitest';
import { HUD } from '@/ui/HUD';

describe('HUD', () => {
  let hud: HUD;
  let parent: HTMLDivElement;

  beforeEach(() => {
    hud = new HUD();
    parent = document.createElement('div');
  });

  it('should add children to parent on mount', () => {
    hud.mount(parent);
    expect(parent.children.length).toBeGreaterThan(0);
  });

  it('should display question number via updateQuestion', () => {
    hud.mount(parent);
    hud.updateQuestion(2, 5);
    const text = parent.textContent;
    expect(text).toContain('2');
    expect(text).toContain('5');
  });

  it('should display score via updateScore', () => {
    hud.mount(parent);
    hud.updateScore(3);
    const text = parent.textContent;
    expect(text).toContain('3');
  });

  it('should remove DOM on unmount', () => {
    hud.mount(parent);
    hud.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('should not throw when calling updateQuestion after unmount', () => {
    hud.mount(parent);
    hud.unmount();
    expect(() => hud.updateQuestion(1, 5)).not.toThrow();
  });

  it('should not throw when calling updateScore after unmount', () => {
    hud.mount(parent);
    hud.unmount();
    expect(() => hud.updateScore(0)).not.toThrow();
  });
});
