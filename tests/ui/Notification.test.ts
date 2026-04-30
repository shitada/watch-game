import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Notification } from '@/ui/Notification';

describe('Notification', () => {
  let notification: Notification;
  let parent: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    notification = new Notification();
    parent = document.createElement('div');
    notification.mount(parent);
  });

  afterEach(() => {
    notification.unmount();
    document.getElementById('notif-anim')?.remove();
    vi.useRealTimers();
  });

  it('show() で通知DOM要素が親要素に追加されること', () => {
    notification.show('テスト', '#FF0000');
    const notif = parent.querySelector('div');
    expect(notif).not.toBeNull();
    expect(notif!.textContent).toBe('テスト');
  });

  it('指定したテキストと色が正しく適用されること', () => {
    notification.show('⭕ せいかい！', '#2ECC71');
    const notif = parent.querySelector('div');
    expect(notif!.textContent).toBe('⭕ せいかい！');
    expect(notif!.style.cssText).toContain('rgb(46, 204, 113)');
  });

  it('デフォルト1200ms後に通知が自動削除されること', () => {
    notification.show('テスト', '#FF0000');
    expect(parent.querySelector('div')).not.toBeNull();
    vi.advanceTimersByTime(1200);
    expect(parent.querySelector('div')).toBeNull();
  });

  it('unmount() で通知が即座に削除されること', () => {
    notification.show('テスト', '#FF0000');
    expect(parent.querySelector('div')).not.toBeNull();
    notification.unmount();
    expect(parent.querySelector('div')).toBeNull();
  });

  it('unmount() で内部タイマーがクリアされること', () => {
    notification.show('テスト', '#FF0000');
    notification.unmount();
    // タイマーを進めてもエラーが発生しないこと
    vi.advanceTimersByTime(2000);
  });

  it('CSSアニメーション用の <style> 要素が1つだけ追加されること', () => {
    notification.show('1回目', '#FF0000');
    notification.show('2回目', '#00FF00');
    const styles = document.querySelectorAll('#notif-anim');
    expect(styles.length).toBe(1);
  });

  it('複数回 show() を呼んでも前の通知が正しくクリーンアップされること', () => {
    notification.show('1回目', '#FF0000');
    notification.show('2回目', '#00FF00');
    const notifs = parent.querySelectorAll('div');
    expect(notifs.length).toBe(1);
    expect(notifs[0].textContent).toBe('2回目');
  });

  it('mount前にshow()を呼んでもエラーにならないこと', () => {
    const n = new Notification();
    expect(() => n.show('テスト', '#FF0000')).not.toThrow();
  });
});
