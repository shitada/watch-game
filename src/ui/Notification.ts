export interface NotificationOptions {
  top?: string;
  fontSize?: string;
  padding?: string;
}

let notifCounter = 0;

export function showNotification(
  parent: HTMLElement,
  text: string,
  color: string,
  options?: NotificationOptions,
): ReturnType<typeof setTimeout> {
  const top = options?.top ?? '40%';
  const fontSize = options?.fontSize ?? 'clamp(24px, 5vw, 40px)';
  const padding = options?.padding ?? '16px 32px';

  const notif = document.createElement('div');
  // Accessibility: announce to screen readers
  notif.setAttribute('role', 'status');
  notif.setAttribute('aria-live', 'polite');
  notif.dataset.notifId = String(++notifCounter);

  notif.textContent = text;
  notif.style.cssText = `
    position: absolute;
    top: ${top};
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Zen Maru Gothic', sans-serif;
    font-size: ${fontSize};
    font-weight: 900;
    color: ${color};
    background: rgba(255,255,255,0.95);
    padding: ${padding};
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

  parent.appendChild(notif);
  return setTimeout(() => notif.remove(), 1200);
}
