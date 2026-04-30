let styleInjected = false;

export interface NotificationStyle {
  top?: string;
  fontSize?: string;
  padding?: string;
}

const DEFAULT_STYLE: Required<NotificationStyle> = {
  top: '40%',
  fontSize: 'clamp(24px, 5vw, 40px)',
  padding: '16px 32px',
};

export class Notification {
  private parent: HTMLElement | null = null;
  private pendingTimers: ReturnType<typeof setTimeout>[] = [];
  private activeElements: HTMLDivElement[] = [];
  private style: Required<NotificationStyle>;

  constructor(style?: NotificationStyle) {
    this.style = { ...DEFAULT_STYLE, ...style };
  }

  mount(parent: HTMLElement): void {
    this.parent = parent;
  }

  show(text: string, color: string, durationMs = 1200): void {
    if (!this.parent) return;

    this.injectStyle();

    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
      position: absolute;
      top: ${this.style.top};
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: ${this.style.fontSize};
      font-weight: 900;
      color: ${color};
      background: rgba(255,255,255,0.95);
      padding: ${this.style.padding};
      border-radius: 20px;
      border: 3px solid ${color};
      pointer-events: none;
      animation: notifPop 0.3s ease-out;
      z-index: 50;
    `;

    this.parent.appendChild(notif);
    this.activeElements.push(notif);

    const timer = setTimeout(() => {
      notif.remove();
      const idx = this.activeElements.indexOf(notif);
      if (idx !== -1) this.activeElements.splice(idx, 1);
    }, durationMs);
    this.pendingTimers.push(timer);
  }

  clearAll(): void {
    this.pendingTimers.forEach(id => clearTimeout(id));
    this.pendingTimers = [];
    this.activeElements.forEach(el => el.remove());
    this.activeElements = [];
  }

  unmount(): void {
    this.clearAll();
    this.parent = null;
  }

  private injectStyle(): void {
    if (styleInjected) return;
    const style = document.createElement('style');
    style.id = 'notif-anim';
    style.textContent = `
      @keyframes notifPop {
        0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    styleInjected = true;
  }
}

export function resetNotificationStyleInjection(): void {
  styleInjected = false;
}
