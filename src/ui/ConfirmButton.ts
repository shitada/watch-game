export interface ConfirmButtonOptions {
  label?: string;
  colorFrom?: string;
  colorTo?: string;
}

export class ConfirmButton {
  private button: HTMLButtonElement | null = null;
  private clickCallback: (() => void) | null = null;
  private label: string;
  private colorFrom: string;
  private colorTo: string;

  constructor(options: ConfirmButtonOptions = {}) {
    this.label = options.label ?? 'けってい！';
    this.colorFrom = options.colorFrom ?? '#2ECC71';
    this.colorTo = options.colorTo ?? '#27AE60';
  }

  mount(parent: HTMLElement): void {
    this.button = document.createElement('button');
    this.button.textContent = this.label;
    this.button.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(20px, 4vw, 32px);
      font-weight: 900;
      padding: 16px 48px;
      border: none;
      border-radius: 50px;
      background: linear-gradient(180deg, ${this.colorFrom}, ${this.colorTo});
      color: #fff;
      cursor: pointer;
      pointer-events: auto;
      touch-action: manipulation;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: transform 0.1s;
    `;
    this.button.addEventListener('pointerdown', () => {
      if (this.button) this.button.style.transform = 'scale(0.95)';
    });
    this.button.addEventListener('pointerup', () => {
      if (this.button) this.button.style.transform = 'scale(1)';
    });
    this.button.addEventListener('pointerleave', () => {
      if (this.button) this.button.style.transform = 'scale(1)';
    });
    this.button.addEventListener('click', () => {
      this.clickCallback?.();
    });
    parent.appendChild(this.button);
  }

  onClick(callback: () => void): void {
    this.clickCallback = callback;
  }

  enable(): void {
    if (this.button?.style) {
      this.button.style.opacity = '1';
      this.button.style.pointerEvents = 'auto';
      this.button.style.cursor = 'pointer';
    }
  }

  disable(): void {
    if (this.button?.style) {
      this.button.style.opacity = '0.5';
      this.button.style.pointerEvents = 'none';
      this.button.style.cursor = 'default';
      this.button.style.transform = 'scale(1)';
    }
  }

  unmount(): void {
    this.button?.remove();
    this.button = null;
    this.clickCallback = null;
  }
}
