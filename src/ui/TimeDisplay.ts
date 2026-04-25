import type { ClockTime } from '@/types';
import { formatTime } from '@/game/systems/QuizGenerator';

export class TimeDisplay {
  private container: HTMLDivElement | null = null;
  private timeEl: HTMLSpanElement | null = null;

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      pointer-events: none;
    `;

    const label = document.createElement('div');
    label.textContent = 'この じかん に あわせよう！';
    label.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(14px, 2.5vw, 20px);
      color: #7F8C8D;
      font-weight: 700;
    `;

    this.timeEl = document.createElement('span');
    this.timeEl.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(28px, 6vw, 48px);
      font-weight: 900;
      color: #2C3E50;
      background: rgba(255,255,255,0.9);
      border-radius: 20px;
      padding: 12px 32px;
      border: 3px solid #3498DB;
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
