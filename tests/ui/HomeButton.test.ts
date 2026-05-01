import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HomeButton } from '@/ui/HomeButton';

describe('HomeButton', () => {
  let homeButton: HomeButton;
  let parent: HTMLDivElement;

  beforeEach(() => {
    homeButton = new HomeButton();
    parent = document.createElement('div');
  });

  it('mount() で親要素にボタンが追加されること', () => {
    homeButton.mount(parent);
    expect(parent.querySelector('button')).not.toBeNull();
  });

  it('ボタンテキストが「🏠」であること', () => {
    homeButton.mount(parent);
    const button = parent.querySelector('button')!;
    expect(button.textContent).toBe('🏠');
  });

  it('onClick() で登録したコールバックがクリック時に呼ばれること', () => {
    homeButton.mount(parent);
    const callback = vi.fn();
    homeButton.onClick(callback);
    parent.querySelector('button')!.dispatchEvent(new Event('click'));
    expect(callback).toHaveBeenCalledOnce();
  });

  it('unmount() で DOM が除去されること', () => {
    homeButton.mount(parent);
    homeButton.unmount();
    expect(parent.querySelector('button')).toBeNull();
  });

  it('unmount() 後にクリックしてもコールバックが呼ばれないこと', () => {
    homeButton.mount(parent);
    const callback = vi.fn();
    homeButton.onClick(callback);
    const button = parent.querySelector('button')!;
    homeButton.unmount();
    button.dispatchEvent(new Event('click'));
    expect(callback).not.toHaveBeenCalled();
  });
});
