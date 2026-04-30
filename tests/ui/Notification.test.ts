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
    notification.dispose();
    vi.useRealTimers();
  });

  it('should add a style element to document.head on mount', () => {
    const style = document.getElementById('notif-anim');
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe('STYLE');
  });

  it('should append a notification element to parent on show()', () => {
    notification.show('せいかい！', '#2ECC71');
    const notif = parent.querySelector('div');
    expect(notif).not.toBeNull();
    expect(notif?.textContent).toBe('せいかい！');
  });

  it('should apply the specified color to the notification', () => {
    notification.show('テスト', '#E74C3C');
    const notif = parent.querySelector('div')!;
    // jsdom normalizes hex to rgb
    expect(notif.style.color).toBe('rgb(231, 76, 60)');
  });

  it('should auto-remove notification after 1200ms', () => {
    notification.show('消える通知', '#2ECC71');
    expect(parent.querySelector('div')).not.toBeNull();
    vi.advanceTimersByTime(1200);
    expect(parent.querySelector('div')).toBeNull();
  });

  it('should support multiple simultaneous notifications', () => {
    notification.show('通知1', '#2ECC71');
    notification.show('通知2', '#E74C3C');
    const divs = parent.querySelectorAll('div');
    expect(divs.length).toBe(2);
  });

  it('should clear all pending timers on clearAll()', () => {
    notification.show('通知1', '#2ECC71');
    notification.show('通知2', '#E74C3C');
    notification.clearAll();
    vi.advanceTimersByTime(2000);
    // Elements remain because timers were cleared
    const divs = parent.querySelectorAll('div');
    expect(divs.length).toBe(2);
  });

  it('should remove style element from document.head on dispose()', () => {
    notification.dispose();
    const style = document.getElementById('notif-anim');
    expect(style).toBeNull();
  });

  it('should clear timers on dispose()', () => {
    notification.show('テスト', '#2ECC71');
    notification.dispose();
    vi.advanceTimersByTime(2000);
    // No errors thrown — timers were cleared
  });

  it('should not throw when show() is called after dispose()', () => {
    notification.dispose();
    expect(() => notification.show('テスト', '#2ECC71')).not.toThrow();
  });

  it('should not duplicate style element on multiple mounts', () => {
    const other = new Notification();
    const parent2 = document.createElement('div');
    other.mount(parent2);
    const styles = document.querySelectorAll('#notif-anim');
    expect(styles.length).toBe(1);
    other.dispose();
  });
});
