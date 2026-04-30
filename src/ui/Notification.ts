export interface NotificationOptions {
  topPercent?: number;
  fontSize?: string;
  padding?: string;
}

const DEFAULTS: Required<NotificationOptions> = {
  topPercent: 40,
  fontSize: 'clamp(24px, 5vw, 40px)',
  padding: '16px 32px',
};

export class Notification {
  private element: HTMLDivElement | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  show(parent: HTMLElement, text: string, color: string, options?: NotificationOptions): void {
    this.cleanup();

    const opts = { ...DEFAULTS, ...options };
    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
      position: absolute;
      top: ${opts.topPercent}%;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: ${opts.fontSize};
      font-weight: 900;
      color: ${color};
      background: rgba(255,255,255,0.95);
      padding: ${opts.padding};
      border-radius: 20px;
      border: 3px solid ${color};
      pointer-events: none;
      animation: notifPop 0.3s ease-out;
      z-index: 50;
    `;

    Notification.ensureAnimStyle();

    parent.appendChild(notif);
    this.element = notif;
    this.timerId = setTimeout(() => {
      this.element?.remove();
      this.element = null;
      this.timerId = null;
    }, 1200);
  }

  cleanup(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.element?.remove();
    this.element = null;
  }

  private static ensureAnimStyle(): void {
    if (document.getElementById('notif-anim')) return;
    const style = document.createElement('style');
    style.id = 'notif-anim';
    style.textContent = `
      @keyframes notifPop {
        0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}
