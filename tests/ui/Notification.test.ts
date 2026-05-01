import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showNotification } from '@/ui/Notification';

describe('showNotification', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    // Remove injected style
    document.getElementById('notif-anim')?.remove();
  });

  it('DOM要素が親に追加されること', () => {
    showNotification(parent, 'テスト', '#2ECC71');
    expect(parent.children.length).toBe(1);
    expect(parent.children[0].textContent).toBe('テスト');
  });

  it('指定されたテキストと色が反映されること', () => {
    showNotification(parent, '⭕ せいかい！', '#2ECC71');
    const el = parent.children[0] as HTMLElement;
    expect(el.textContent).toBe('⭕ せいかい！');
    // jsdom normalizes hex colors to rgb
    expect(el.style.color).toBe('rgb(46, 204, 113)');
  });

  it('notif-anim スタイル要素が document.head に1つだけ存在すること', () => {
    showNotification(parent, 'a', '#fff');
    showNotification(parent, 'b', '#fff');
    showNotification(parent, 'c', '#fff');
    const styles = document.querySelectorAll('#notif-anim');
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toContain('@keyframes notifPop');
  });

  it('1200ms後にDOM要素が自動削除されること', () => {
    showNotification(parent, 'テスト', '#2ECC71');
    expect(parent.children.length).toBe(1);
    vi.advanceTimersByTime(1199);
    expect(parent.children.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(parent.children.length).toBe(0);
  });

  it('topオプションでカスタム位置が設定できること', () => {
    showNotification(parent, 'テスト', '#2ECC71', { top: '35%' });
    const el = parent.children[0] as HTMLElement;
    expect(el.style.cssText).toContain('top: 35%');
  });

  it('デフォルトのtopは40%であること', () => {
    showNotification(parent, 'テスト', '#2ECC71');
    const el = parent.children[0] as HTMLElement;
    expect(el.style.cssText).toContain('top: 40%');
  });

  it('fontSizeオプションでフォントサイズを変更できること', () => {
    showNotification(parent, 'テスト', '#2ECC71', {
      fontSize: '22px',
    });
    const el = parent.children[0] as HTMLElement;
    expect(el.style.fontSize).toBe('22px');
  });

  it('paddingオプションでパディングを変更できること', () => {
    showNotification(parent, 'テスト', '#2ECC71', {
      padding: '14px 28px',
    });
    const el = parent.children[0] as HTMLElement;
    expect(el.style.cssText).toContain('14px 28px');
  });

  it('タイマーIDを返すこと', () => {
    const timerId = showNotification(parent, 'テスト', '#2ECC71');
    expect(timerId).toBeDefined();
    expect(typeof timerId).not.toBe('undefined');
  });
});
