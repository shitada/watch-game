import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmButton } from '@/ui/ConfirmButton';

describe('ConfirmButton', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
  });

  it('mount(parent) でボタン要素が parent に追加されること', () => {
    const btn = new ConfirmButton();
    btn.mount(parent);
    expect(parent.querySelector('button')).not.toBeNull();
  });

  it('デフォルトのラベルが「けってい！」であること', () => {
    const btn = new ConfirmButton();
    btn.mount(parent);
    expect(parent.querySelector('button')!.textContent).toBe('けってい！');
  });

  it('カスタムラベルが適用されること', () => {
    const btn = new ConfirmButton({ label: 'OK!' });
    btn.mount(parent);
    expect(parent.querySelector('button')!.textContent).toBe('OK!');
  });

  it('unmount() でボタン要素が削除されること', () => {
    const btn = new ConfirmButton();
    btn.mount(parent);
    btn.unmount();
    expect(parent.querySelector('button')).toBeNull();
  });

  it('onClick(callback) でクリック時にコールバックが呼ばれること', () => {
    const btn = new ConfirmButton();
    const callback = vi.fn();
    btn.mount(parent);
    btn.onClick(callback);
    parent.querySelector('button')!.dispatchEvent(new Event('click'));
    expect(callback).toHaveBeenCalledOnce();
  });

  it('unmount() 後にクリックしてもコールバックが呼ばれないこと', () => {
    const btn = new ConfirmButton();
    const callback = vi.fn();
    btn.mount(parent);
    btn.onClick(callback);
    const button = parent.querySelector('button')!;
    btn.unmount();
    button.dispatchEvent(new Event('click'));
    expect(callback).not.toHaveBeenCalled();
  });

  it('disable() で opacity が 0.5、pointerEvents が none になること', () => {
    const btn = new ConfirmButton();
    btn.mount(parent);
    btn.disable();
    const button = parent.querySelector('button')!;
    expect(button.style.opacity).toBe('0.5');
    expect(button.style.pointerEvents).toBe('none');
  });

  it('enable() で opacity が 1、pointerEvents が auto になること', () => {
    const btn = new ConfirmButton();
    btn.mount(parent);
    btn.disable();
    btn.enable();
    const button = parent.querySelector('button')!;
    expect(button.style.opacity).toBe('1');
    expect(button.style.pointerEvents).toBe('auto');
  });

  it('カスタムカラー（gradient）が適用されること', () => {
    const btn = new ConfirmButton({ colorFrom: '#E67E22', colorTo: '#D35400' });
    btn.mount(parent);
    const button = parent.querySelector('button')!;
    const bg = button.style.background;
    expect(bg).toContain('linear-gradient');
    // jsdom converts hex to rgb: #E67E22 → rgb(230, 126, 34)
    expect(bg).toContain('230, 126, 34');
  });

  it('デフォルトカラー（グリーン gradient）が適用されること', () => {
    const btn = new ConfirmButton();
    btn.mount(parent);
    const button = parent.querySelector('button')!;
    const bg = button.style.background;
    expect(bg).toContain('linear-gradient');
    // jsdom converts hex to rgb: #2ECC71 → rgb(46, 204, 113)
    expect(bg).toContain('46, 204, 113');
  });
});
