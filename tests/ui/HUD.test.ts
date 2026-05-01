import { describe, it, expect, beforeEach } from 'vitest';
import { HUD } from '@/ui/HUD';

describe('HUD', () => {
  let hud: HUD;
  let parent: HTMLDivElement;

  beforeEach(() => {
    hud = new HUD();
    parent = document.createElement('div');
  });

  it('mount() で親要素に DOM が追加されること', () => {
    hud.mount(parent);
    expect(parent.children.length).toBe(1);
  });

  it('mount() で questionEl と scoreEl が生成されること', () => {
    hud.mount(parent);
    const container = parent.children[0];
    expect(container.children.length).toBe(2);
  });

  it('updateQuestion(3, 5) で「もんだい 3/5」が表示されること', () => {
    hud.mount(parent);
    hud.updateQuestion(3, 5);
    const spans = parent.querySelectorAll('span');
    expect(spans[0].textContent).toBe('もんだい 3/5');
  });

  it('updateScore(2) で「⭕ 2」が表示されること', () => {
    hud.mount(parent);
    hud.updateScore(2);
    const spans = parent.querySelectorAll('span');
    expect(spans[1].textContent).toBe('⭕ 2');
  });

  it('unmount() で DOM が除去されること', () => {
    hud.mount(parent);
    hud.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('unmount() 後に updateQuestion/updateScore を呼んでもエラーにならないこと', () => {
    hud.mount(parent);
    hud.unmount();
    expect(() => {
      hud.updateQuestion(1, 5);
      hud.updateScore(0);
    }).not.toThrow();
  });

  it('スタイルに pointer-events: none が設定されること', () => {
    hud.mount(parent);
    const container = parent.children[0] as HTMLElement;
    expect(container.style.pointerEvents).toBe('none');
  });
});
