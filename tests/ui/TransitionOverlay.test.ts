import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransitionOverlay } from '@/ui/TransitionOverlay';

describe('TransitionOverlay', () => {
  let overlay: TransitionOverlay;
  let parent: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    parent = document.createElement('div');
    document.body.appendChild(parent);
    overlay = new TransitionOverlay();
  });

  afterEach(() => {
    overlay.unmount();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('mount で DOM 要素が追加されること', () => {
    overlay.mount(parent);
    expect(parent.children.length).toBe(1);
    expect(parent.children[0].tagName).toBe('DIV');
  });

  it('初期状態で opacity: 0, pointer-events: none であること', () => {
    overlay.mount(parent);
    const el = parent.children[0] as HTMLElement;
    expect(el.style.opacity).toBe('0');
    expect(el.style.pointerEvents).toBe('none');
  });

  it('z-index が 200 であること', () => {
    overlay.mount(parent);
    const el = parent.children[0] as HTMLElement;
    expect(el.style.zIndex).toBe('200');
  });

  it('fadeOut で opacity が 1 になること', () => {
    overlay.mount(parent);
    overlay.fadeOut(() => {});
    const el = parent.children[0] as HTMLElement;
    expect(el.style.opacity).toBe('1');
  });

  it('fadeOut 開始時に pointer-events: auto になること', () => {
    overlay.mount(parent);
    overlay.fadeOut(() => {});
    const el = parent.children[0] as HTMLElement;
    expect(el.style.pointerEvents).toBe('auto');
  });

  it('fadeOut のコールバックが transitionend 後に呼ばれること', () => {
    overlay.mount(parent);
    const callback = vi.fn();
    overlay.fadeOut(callback);
    const el = parent.children[0] as HTMLElement;

    // transitionend イベントを手動 dispatch
    const event = new Event('transitionend');
    Object.defineProperty(event, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fadeOut のコールバックが propertyName !== opacity の場合は呼ばれないこと', () => {
    overlay.mount(parent);
    const callback = vi.fn();
    overlay.fadeOut(callback);
    const el = parent.children[0] as HTMLElement;

    const event = new Event('transitionend');
    Object.defineProperty(event, 'propertyName', { value: 'transform' });
    el.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('fadeOut のコールバックが setTimeout フォールバックで呼ばれること', () => {
    overlay.mount(parent);
    const callback = vi.fn();
    overlay.fadeOut(callback);

    // transitionend を発火させずにタイマーを進める
    vi.advanceTimersByTime(250);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fadeIn で opacity が 0 に戻ること', () => {
    overlay.mount(parent);
    overlay.fadeOut(() => {});
    const el = parent.children[0] as HTMLElement;

    // fadeOut 完了
    const fadeOutEvent = new Event('transitionend');
    Object.defineProperty(fadeOutEvent, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(fadeOutEvent);

    overlay.fadeIn();
    expect(el.style.opacity).toBe('0');
  });

  it('fadeIn 完了後に pointer-events: none に戻ること', () => {
    overlay.mount(parent);
    overlay.fadeOut(() => {});
    const el = parent.children[0] as HTMLElement;

    // fadeOut 完了
    const fadeOutEvent = new Event('transitionend');
    Object.defineProperty(fadeOutEvent, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(fadeOutEvent);

    overlay.fadeIn();

    // fadeIn 完了
    const fadeInEvent = new Event('transitionend');
    Object.defineProperty(fadeInEvent, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(fadeInEvent);

    expect(el.style.pointerEvents).toBe('none');
  });

  it('fadeIn 完了後に isTransitioning が false になること', () => {
    overlay.mount(parent);
    overlay.fadeOut(() => {});
    const el = parent.children[0] as HTMLElement;

    // fadeOut 完了
    const fadeOutEvent = new Event('transitionend');
    Object.defineProperty(fadeOutEvent, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(fadeOutEvent);

    overlay.fadeIn();

    // fadeIn 完了
    const fadeInEvent = new Event('transitionend');
    Object.defineProperty(fadeInEvent, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(fadeInEvent);

    expect(overlay.isTransitioning()).toBe(false);
  });

  it('fadeIn の setTimeout フォールバックで pointer-events: none に戻ること', () => {
    overlay.mount(parent);
    overlay.fadeOut(() => {});
    const el = parent.children[0] as HTMLElement;

    // fadeOut をタイマーで完了
    vi.advanceTimersByTime(250);

    overlay.fadeIn();
    vi.advanceTimersByTime(250);

    expect(el.style.pointerEvents).toBe('none');
    expect(overlay.isTransitioning()).toBe(false);
  });

  it('isTransitioning() がフェード中に true を返すこと', () => {
    overlay.mount(parent);
    expect(overlay.isTransitioning()).toBe(false);
    overlay.fadeOut(() => {});
    expect(overlay.isTransitioning()).toBe(true);
  });

  it('二重 fadeOut 呼び出し時にガードが機能すること', () => {
    overlay.mount(parent);
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    overlay.fadeOut(callback1);
    overlay.fadeOut(callback2);

    const el = parent.children[0] as HTMLElement;
    const event = new Event('transitionend');
    Object.defineProperty(event, 'propertyName', { value: 'opacity' });
    el.dispatchEvent(event);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();
  });

  it('unmount で DOM 要素が除去されること', () => {
    overlay.mount(parent);
    expect(parent.children.length).toBe(1);
    overlay.unmount();
    expect(parent.children.length).toBe(0);
  });

  it('unmount で setTimeout タイマーがクリアされること', () => {
    overlay.mount(parent);
    const callback = vi.fn();
    overlay.fadeOut(callback);

    overlay.unmount();

    // タイマーを進めてもコールバックが呼ばれない
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });
});
