import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Notification, resetNotificationStyleInjection } from '@/ui/Notification';

describe('Notification', () => {
  let notification: Notification;
  let parent: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    resetNotificationStyleInjection();
    const existing = document.getElementById('notif-anim');
    if (existing) existing.remove();

    notification = new Notification();
    parent = document.createElement('div');
    notification.mount(parent);
  });

  afterEach(() => {
    notification.unmount();
    vi.useRealTimers();
  });

  it('should create a notification element on show', () => {
    notification.show('テスト', '#2ECC71');
    const notif = parent.querySelector('div');
    expect(notif).not.toBeNull();
    expect(notif!.textContent).toBe('テスト');
  });

  it('should apply the correct color to style and border', () => {
    notification.show('テスト', '#E74C3C');
    const notif = parent.querySelector('div')!;
    expect(notif.style.color).toBe('rgb(231, 76, 60)');
  });

  it('should auto-remove after durationMs', () => {
    notification.show('テスト', '#2ECC71', 1000);
    expect(parent.querySelector('div')).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(parent.querySelector('div')).toBeNull();
  });

  it('should use default duration of 1200ms', () => {
    notification.show('テスト', '#2ECC71');
    vi.advanceTimersByTime(1199);
    expect(parent.querySelector('div')).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(parent.querySelector('div')).toBeNull();
  });

  it('should not create element if not mounted', () => {
    const unmounted = new Notification();
    unmounted.show('テスト', '#2ECC71');
    // No error thrown, no element created
    expect(parent.children.length).toBe(0);
  });

  it('should not create element after unmount', () => {
    notification.unmount();
    notification.show('テスト', '#2ECC71');
    expect(parent.children.length).toBe(0);
  });

  it('should clear all notifications on clearAll', () => {
    notification.show('1', '#2ECC71');
    notification.show('2', '#E74C3C');
    expect(parent.querySelectorAll('div').length).toBe(2);
    notification.clearAll();
    expect(parent.querySelectorAll('div').length).toBe(0);
  });

  it('should clear timers on clearAll so elements are not removed twice', () => {
    notification.show('テスト', '#2ECC71', 500);
    notification.clearAll();
    // Advancing time should not cause errors
    vi.advanceTimersByTime(500);
    expect(parent.querySelectorAll('div').length).toBe(0);
  });

  it('should clear all on unmount', () => {
    notification.show('1', '#2ECC71');
    notification.show('2', '#E74C3C');
    notification.unmount();
    expect(parent.querySelectorAll('div').length).toBe(0);
  });

  it('should inject @keyframes style into head only once', () => {
    notification.show('1', '#2ECC71');
    notification.show('2', '#E74C3C');
    const styles = document.querySelectorAll('#notif-anim');
    expect(styles.length).toBe(1);
  });

  it('should inject style across multiple instances only once', () => {
    const notification2 = new Notification();
    const parent2 = document.createElement('div');
    notification2.mount(parent2);

    notification.show('1', '#2ECC71');
    notification2.show('2', '#E74C3C');

    const styles = document.querySelectorAll('#notif-anim');
    expect(styles.length).toBe(1);
    notification2.unmount();
  });

  it('should use default style values', () => {
    notification.show('テスト', '#2ECC71');
    const notif = parent.querySelector('div')!;
    expect(notif.style.top).toBe('40%');
    expect(notif.style.padding).toBe('16px 32px');
  });

  it('should accept custom style overrides', () => {
    const custom = new Notification({
      top: '35%',
      fontSize: 'clamp(22px, 4.5vw, 36px)',
      padding: '14px 28px',
    });
    const customParent = document.createElement('div');
    custom.mount(customParent);
    custom.show('テスト', '#2ECC71');

    const notif = customParent.querySelector('div')!;
    expect(notif.style.top).toBe('35%');
    expect(notif.style.padding).toBe('14px 28px');
    custom.unmount();
  });

  it('should handle show called with parent as null gracefully', () => {
    const n = new Notification();
    // show without mount should not throw
    expect(() => n.show('test', '#000')).not.toThrow();
  });
});
