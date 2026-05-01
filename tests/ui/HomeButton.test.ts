import { describe, it, expect, beforeEach } from 'vitest';
import { HomeButton } from '@/ui/HomeButton';

describe('HomeButton', () => {
  let homeButton: HomeButton;
  let parent: HTMLDivElement;

  beforeEach(() => {
    homeButton = new HomeButton();
    parent = document.createElement('div');
    homeButton.mount(parent);
  });

  it('should mount a button element', () => {
    const button = parent.querySelector('button');
    expect(button).not.toBeNull();
  });

  it('should display home emoji', () => {
    const button = parent.querySelector('button')!;
    expect(button.textContent).toBe('🏠');
  });

  it('should call onClick callback when clicked', () => {
    let called = false;
    homeButton.onClick(() => { called = true; });
    const button = parent.querySelector('button')!;
    button.dispatchEvent(new Event('click'));
    expect(called).toBe(true);
  });

  it('should not throw when clicked without callback', () => {
    const button = parent.querySelector('button')!;
    expect(() => button.dispatchEvent(new Event('click'))).not.toThrow();
  });

  it('should replace previous callback with new one', () => {
    let first = false;
    let second = false;
    homeButton.onClick(() => { first = true; });
    homeButton.onClick(() => { second = true; });
    const button = parent.querySelector('button')!;
    button.dispatchEvent(new Event('click'));
    expect(first).toBe(false);
    expect(second).toBe(true);
  });

  it('should clean up on unmount', () => {
    homeButton.unmount();
    expect(parent.querySelector('button')).toBeNull();
  });

  it('should not crash when calling unmount twice', () => {
    homeButton.unmount();
    expect(() => homeButton.unmount()).not.toThrow();
  });
});
