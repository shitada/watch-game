import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HintButton } from '@/ui/HintButton';

describe('HintButton', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
  });

  it('mount(parent) でボタン要素が追加されること', () => {
    const b = new HintButton();
    b.mount(parent);
    expect(parent.querySelector('button')).not.toBeNull();
  });

  it('ラベルが「ヒント🟢」であること', () => {
    const b = new HintButton();
    b.mount(parent);
    expect(parent.querySelector('button')!.textContent).toBe('ヒント🟢');
  });

  it('onClick(callback) でクリック時にコールバックが呼ばれること', () => {
    const b = new HintButton();
    const cb = vi.fn();
    b.mount(parent);
    b.onClick(cb);
    parent.querySelector('button')!.dispatchEvent(new Event('click'));
    expect(cb).toHaveBeenCalledOnce();
  });

  it('setRemaining(0) でバッジが 0 になりボタンが無効化されること', () => {
    const b = new HintButton();
    b.mount(parent);
    b.setRemaining(0);
    const badge = parent.querySelector('span')!;
    expect(badge.textContent).toBe('0');
    const button = parent.querySelector('button')!;
    expect(button.style.pointerEvents).toBe('none');
  });
});
