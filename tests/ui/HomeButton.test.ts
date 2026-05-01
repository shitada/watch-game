import { describe, it, expect, beforeEach } from 'vitest';
import { HomeButton } from '@/ui/HomeButton';

describe('HomeButton', () => {
  let homeButton: HomeButton;
  let parent: HTMLDivElement;

  beforeEach(() => {
    homeButton = new HomeButton();
    parent = document.createElement('div');
  });

  it('should add a button to parent on mount', () => {
    homeButton.mount(parent);
    expect(parent.querySelector('button')).not.toBeNull();
  });

  it('should contain 🏠 in button text', () => {
    homeButton.mount(parent);
    const btn = parent.querySelector('button')!;
    expect(btn.textContent).toContain('🏠');
  });

  it('should call onClick callback when clicked', () => {
    homeButton.mount(parent);
    let called = false;
    homeButton.onClick(() => { called = true; });
    parent.querySelector('button')!.dispatchEvent(new Event('click'));
    expect(called).toBe(true);
  });

  it('should remove DOM on unmount', () => {
    homeButton.mount(parent);
    homeButton.unmount();
    expect(parent.querySelector('button')).toBeNull();
  });
});
