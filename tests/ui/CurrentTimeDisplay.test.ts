import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CurrentTimeDisplay } from '@/ui/CurrentTimeDisplay';

describe('CurrentTimeDisplay', () => {
  let parent: HTMLDivElement;
  let display: CurrentTimeDisplay;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    display = new CurrentTimeDisplay();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mount後にDOM要素が親に追加されること', () => {
    display.mount(parent);
    expect(parent.children.length).toBe(1);
  });

  it('ラベルに「いま ▶」が表示されること', () => {
    display.mount(parent);
    const container = parent.children[0] as HTMLElement;
    const label = container.querySelector('span');
    expect(label?.textContent).toBe('いま ▶ ');
  });

  it('setTime()で表示テキストがformatTimeと一致すること（正時）', () => {
    display.mount(parent);
    display.setTime({ hours: 3, minutes: 0 });
    const timeEl = parent.querySelector('[data-testid="current-time"]') as HTMLElement;
    expect(timeEl.textContent).toBe('⏰ 3じ');
  });

  it('setTime()で表示テキストがformatTimeと一致すること（30分）', () => {
    display.mount(parent);
    display.setTime({ hours: 7, minutes: 30 });
    const timeEl = parent.querySelector('[data-testid="current-time"]') as HTMLElement;
    expect(timeEl.textContent).toBe('⏰ 7じはん');
  });

  it('setTime()で表示テキストがformatTimeと一致すること（任意の分）', () => {
    display.mount(parent);
    display.setTime({ hours: 10, minutes: 15 });
    const timeEl = parent.querySelector('[data-testid="current-time"]') as HTMLElement;
    expect(timeEl.textContent).toBe('⏰ 10じ15ふん');
  });

  it('mount前のsetTimeはエラーにならないこと', () => {
    expect(() => display.setTime({ hours: 1, minutes: 0 })).not.toThrow();
  });

  it('unmountでDOM要素がクリーンアップされること', () => {
    display.mount(parent);
    expect(parent.children.length).toBe(1);
    display.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('unmount後のsetTimeはエラーにならないこと', () => {
    display.mount(parent);
    display.unmount();
    expect(() => display.setTime({ hours: 5, minutes: 0 })).not.toThrow();
  });

  it('半透明スタイルが適用されていること', () => {
    display.mount(parent);
    const container = parent.children[0] as HTMLElement;
    expect(container.style.cssText).toContain('opacity');
  });
});
