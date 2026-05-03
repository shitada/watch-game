export class HintButton {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private badge: HTMLSpanElement | null = null;
  private clickCallback: (() => void) | null = null;

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `position: relative; pointer-events: auto;`;

    this.button = document.createElement('button');
    this.button.textContent = 'ヒント🟢';
    this.button.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(16px, 3.5vw, 22px);
      font-weight: 800;
      padding: 12px 18px;
      border: none;
      border-radius: 28px;
      background: linear-gradient(180deg, #58D68D, #27AE60);
      color: #fff;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
    `;

    this.badge = document.createElement('span');
    this.badge.textContent = '1';
    this.badge.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: #FFF;
      color: #27AE60;
      border-radius: 12px;
      padding: 2px 6px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    `;

    this.container.appendChild(this.button);
    this.container.appendChild(this.badge);
    this.button.addEventListener('click', () => this.clickCallback?.());

    parent.appendChild(this.container);
  }

  onClick(cb: () => void): void {
    this.clickCallback = cb;
  }

  setRemaining(n: number): void {
    if (!this.badge) return;
    this.badge.textContent = String(n);
    if (n <= 0) {
      this.button!.style.opacity = '0.6';
      this.button!.style.pointerEvents = 'none';
    } else {
      this.button!.style.opacity = '1';
      this.button!.style.pointerEvents = 'auto';
    }
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.button = null;
    this.badge = null;
    this.clickCallback = null;
  }
}
