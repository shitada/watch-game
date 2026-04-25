export class HUD {
  private container: HTMLDivElement | null = null;
  private questionEl: HTMLSpanElement | null = null;
  private scoreEl: HTMLSpanElement | null = null;

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px 12px 72px;
      pointer-events: none;
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(16px, 3vw, 24px);
      color: #2C3E50;
    `;

    this.questionEl = document.createElement('span');
    this.questionEl.style.cssText = `
      background: rgba(255,255,255,0.85);
      border-radius: 16px;
      padding: 6px 18px;
      font-weight: 700;
    `;

    this.scoreEl = document.createElement('span');
    this.scoreEl.style.cssText = `
      background: rgba(255,255,255,0.85);
      border-radius: 16px;
      padding: 6px 18px;
      font-weight: 700;
    `;

    this.container.appendChild(this.questionEl);
    this.container.appendChild(this.scoreEl);
    parent.appendChild(this.container);
  }

  updateQuestion(current: number, total: number): void {
    if (this.questionEl) {
      this.questionEl.textContent = `もんだい ${current}/${total}`;
    }
  }

  updateScore(correct: number): void {
    if (this.scoreEl) {
      this.scoreEl.textContent = `⭕ ${correct}`;
    }
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.questionEl = null;
    this.scoreEl = null;
  }
}
