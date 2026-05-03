export class HintCard {
  private el: HTMLDivElement | null = null;
  mount(parent: HTMLElement): void {
    this.el = document.createElement('div');
    this.el.style.cssText = `position: absolute; left: 50%; transform: translateX(-50%); padding: 12px 16px; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.12); font-weight: 700;`;
    parent.appendChild(this.el);
  }

  highlightNumber(n: number): void {
    if (!this.el) return;
    this.el.textContent = `→ ${n} ←`;
  }

  clearHighlight(): void {
    if (!this.el) return;
    this.el.textContent = '';
  }

  unmount(): void {
    if (this.el && this.el.parentElement) this.el.parentElement.removeChild(this.el);
    this.el = null;
  }
}
