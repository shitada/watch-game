import type { DailyEvent } from '@/types';

export class DailyProgress {
  private container: HTMLDivElement | null = null;
  private dots: HTMLDivElement[] = [];

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 16px;
      pointer-events: none;
      flex-wrap: wrap;
    `;
    parent.appendChild(this.container);
  }

  setEvents(events: DailyEvent[], currentIndex: number): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.dots = [];

    events.forEach((event, i) => {
      const dot = document.createElement('div');
      const isDone = i < currentIndex;
      const isCurrent = i === currentIndex;

      dot.textContent = isDone ? '✅' : event.emoji;
      dot.style.cssText = `
        font-size: clamp(16px, 3vw, 24px);
        width: clamp(36px, 6vw, 48px);
        height: clamp(36px, 6vw, 48px);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: ${isCurrent ? '#3498DB' : isDone ? '#2ECC71' : 'rgba(255,255,255,0.7)'};
        border: 2px solid ${isCurrent ? '#2980B9' : isDone ? '#27AE60' : '#BDC3C7'};
        ${isCurrent ? 'box-shadow: 0 0 12px rgba(52,152,219,0.5);' : ''}
        transition: all 0.3s;
      `;

      this.container!.appendChild(dot);
      this.dots.push(dot);
    });
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.dots = [];
  }
}
