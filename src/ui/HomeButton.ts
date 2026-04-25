export class HomeButton {
  private button: HTMLButtonElement | null = null;
  private clickCallback: (() => void) | null = null;

  mount(parent: HTMLElement): void {
    this.button = document.createElement('button');
    this.button.textContent = '🏠';
    this.button.style.cssText = `
      position: absolute;
      top: 12px;
      left: 12px;
      width: clamp(40px, 6vw, 56px);
      height: clamp(40px, 6vw, 56px);
      border-radius: 50%;
      border: 2px solid #BDC3C7;
      background: rgba(255,255,255,0.9);
      font-size: clamp(18px, 3vw, 28px);
      cursor: pointer;
      pointer-events: auto;
      touch-action: manipulation;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    `;
    this.button.addEventListener('click', () => {
      this.clickCallback?.();
    });
    parent.appendChild(this.button);
  }

  onClick(callback: () => void): void {
    this.clickCallback = callback;
  }

  unmount(): void {
    this.button?.remove();
    this.button = null;
    this.clickCallback = null;
  }
}
