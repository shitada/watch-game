import type { ClockTime } from '@/types';
import { formatTime } from '@/game/systems/QuizGenerator';

export class CurrentTimeDisplay {
  private container: HTMLDivElement | null = null;
  private timeEl: HTMLSpanElement | null = null;

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px 12px;
      pointer-events: none;
      opacity: 0.45;
    `;

    const label = document.createElement('span');
    label.textContent = 'いま ▶ ';
    label.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(11px, 2vw, 16px);
      color: #7F8C8D;
      font-weight: 700;
    `;

    this.timeEl = document.createElement('span');
    this.timeEl.setAttribute('data-testid', 'current-time');
    this.timeEl.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(14px, 3vw, 22px);
      font-weight: 900;
      color: #2C3E50;
      background: rgba(255,255,255,0.7);
      border-radius: 12px;
      padding: 4px 14px;
      border: 2px solid #95A5A6;
    `;

    this.container.appendChild(label);
    this.container.appendChild(this.timeEl);
    parent.appendChild(this.container);
  }

  setTime(time: ClockTime): void {
    if (this.timeEl) {
      this.timeEl.textContent = formatTime(time);
    }
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.timeEl = null;
  }
}
