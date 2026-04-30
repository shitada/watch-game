import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Notification } from '@/ui/Notification';

describe('Notification', () => {
  let notification: Notification;
  let parent: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    notification = new Notification();
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(() => {
    notification.cleanup();
    vi.useRealTimers();
    parent.remove();
    document.getElementById('notif-anim')?.remove();
  });

  it('show() で通知要素が parent に追加されること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    const notif = parent.querySelector('div');
    expect(notif).not.toBeNull();
    expect(notif!.textContent).toBe('テスト');
  });

  it('show() でテキストと色が正しく設定されること', () => {
    notification.show(parent, '⭕ せいかい！', '#2ECC71');
    const notif = parent.querySelector('div')!;
    expect(notif.textContent).toBe('⭕ せいかい！');
    // jsdom converts hex to rgb
    expect(notif.style.color).toBe('rgb(46, 204, 113)');
    expect(notif.style.borderColor).toBe('rgb(46, 204, 113)');
  });

  it('show() で notif-anim スタイルが document.head に追加されること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    const style = document.getElementById('notif-anim');
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('notifPop');
  });

  it('notif-anim スタイルは複数回 show() しても1つだけ追加されること', () => {
    notification.show(parent, 'テスト1', '#2ECC71');
    notification.show(parent, 'テスト2', '#E74C3C');
    const styles = document.querySelectorAll('#notif-anim');
    expect(styles.length).toBe(1);
  });

  it('1200ms 後に通知要素が自動削除されること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    expect(parent.querySelector('div')).not.toBeNull();
    vi.advanceTimersByTime(1200);
    expect(parent.querySelector('div')).toBeNull();
  });

  it('cleanup() で通知要素が即座に削除されること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    expect(parent.querySelector('div')).not.toBeNull();
    notification.cleanup();
    expect(parent.querySelector('div')).toBeNull();
  });

  it('cleanup() で内部タイマーがクリアされること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    notification.cleanup();
    // タイマー発火後もエラーにならない
    vi.advanceTimersByTime(2000);
    expect(parent.querySelector('div')).toBeNull();
  });

  it('cleanup() 後も notif-anim スタイルは残ること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    notification.cleanup();
    expect(document.getElementById('notif-anim')).not.toBeNull();
  });

  it('options で topPercent をカスタマイズできること', () => {
    notification.show(parent, 'テスト', '#2ECC71', { topPercent: 35 });
    const notif = parent.querySelector('div')!;
    expect(notif.style.top).toBe('35%');
  });

  it('options で padding をカスタマイズできること', () => {
    notification.show(parent, 'テスト', '#2ECC71', { padding: '14px 28px' });
    const notif = parent.querySelector('div')!;
    expect(notif.style.padding).toBe('14px 28px');
  });

  it('デフォルト値が適用されること', () => {
    notification.show(parent, 'テスト', '#2ECC71');
    const notif = parent.querySelector('div')!;
    expect(notif.style.top).toBe('40%');
    expect(notif.style.padding).toBe('16px 32px');
  });

  it('show() を複数回呼ぶと前の通知が削除されること', () => {
    notification.show(parent, 'テスト1', '#2ECC71');
    notification.show(parent, 'テスト2', '#E74C3C');
    const notifs = parent.querySelectorAll('div');
    expect(notifs.length).toBe(1);
    expect(notifs[0].textContent).toBe('テスト2');
  });
});
