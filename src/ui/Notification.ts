export class Notification {
  private parent: HTMLElement | null = null;
  private element: HTMLDivElement | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  mount(parent: HTMLElement): void {
    this.parent = parent;
  }

  show(text: string, color: string, duration = 1200): void {
    this.clearPending();

    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
      position: absolute;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(24px, 5vw, 40px);
      font-weight: 900;
      color: ${color};
      background: rgba(255,255,255,0.95);
      padding: 16px 32px;
      border-radius: 20px;
      border: 3px solid ${color};
      pointer-events: none;
      animation: notifPop 0.3s ease-out;
      z-index: 50;
    `;

    if (!document.getElementById('notif-anim')) {
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

    this.element = notif;
    this.parent?.appendChild(notif);
    this.timerId = setTimeout(() => {
      this.element?.remove();
      this.element = null;
      this.timerId = null;
    }, duration);
  }

  unmount(): void {
    this.clearPending();
    this.parent = null;
  }

  private clearPending(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.element?.remove();
    this.element = null;
  }
}
