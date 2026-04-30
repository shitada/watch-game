import type { ClockTime } from '@/types';
import { formatTime } from '@/game/systems/QuizGenerator';

export class ChoiceButtons {
  private container: HTMLDivElement | null = null;
  private buttons: HTMLButtonElement[] = [];
  private selectCallback: ((index: number) => void) | null = null;
  private disabled = false;

  mount(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px;
      pointer-events: auto;
      max-width: 500px;
      margin: 0 auto;
    `;
    parent.appendChild(this.container);
  }

  setChoices(choices: ClockTime[]): void {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.buttons = [];
    this.disabled = false;

    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.textContent = formatTime(choice);
      btn.style.cssText = `
        font-family: 'Zen Maru Gothic', sans-serif;
        font-size: clamp(18px, 4vw, 28px);
        font-weight: 700;
        padding: 16px 12px;
        border: 3px solid #3498DB;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff, #EBF5FB);
        color: #2C3E50;
        cursor: pointer;
        touch-action: manipulation;
        transition: transform 0.1s, background 0.2s;
      `;

      btn.addEventListener('pointerdown', () => {
        if (!this.disabled) btn.style.transform = 'scale(0.95)';
      });
      btn.addEventListener('pointerup', () => {
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('click', () => {
        if (this.disabled) return;
        this.selectCallback?.(i);
      });

      this.container!.appendChild(btn);
      this.buttons.push(btn);
    });
  }

  showResult(correctIndex: number, selectedIndex: number): void {
    this.disabled = true;
    this.buttons.forEach((btn, i) => {
      if (i === correctIndex) {
        btn.style.background = 'linear-gradient(180deg, #A9DFBF, #2ECC71)';
        btn.style.borderColor = '#27AE60';
        btn.style.color = '#fff';
      } else if (i === selectedIndex && i !== correctIndex) {
        btn.style.background = 'linear-gradient(180deg, #F5B7B1, #E74C3C)';
        btn.style.borderColor = '#C0392B';
        btn.style.color = '#fff';
      } else {
        btn.style.opacity = '0.5';
      }
    });
  }

  onSelect(callback: (index: number) => void): void {
    this.selectCallback = callback;
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.buttons = [];
    this.selectCallback = null;
  }
}
