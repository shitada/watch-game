import type { ClockTime } from '@/types';
import { formatTime } from '@/game/systems/QuizGenerator';

export class ChoiceButtons {
  private container: HTMLDivElement | null = null;
  private buttons: HTMLButtonElement[] = [];
  private selectCallback: ((index: number) => void) | null = null;
  private disabled = false;
  private rng: () => number;
  private liveRegion: HTMLDivElement | null = null;

  constructor(rng?: () => number) {
    this.rng = rng ?? Math.random;
  }

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
      position: relative;
    `;

    // Invisible aria-live region for screen readers
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.cssText = `
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    `;
    this.container.appendChild(this.liveRegion);

    parent.appendChild(this.container);
  }

  setChoices(choices: ClockTime[]): void {
    if (!this.container) return;
    // Remove all children but keep liveRegion if present
    const live = this.liveRegion;
    this.container.innerHTML = '';
    if (live) this.container.appendChild(live);

    this.buttons = [];
    this.disabled = false;

    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.textContent = formatTime(choice);
      // Add ARIA label for accessibility and increase min-height for touch targets
      btn.setAttribute('aria-label', formatTime(choice));
      btn.style.cssText = `
        font-family: 'Zen Maru Gothic', sans-serif;
        font-size: clamp(18px, 4vw, 28px);
        font-weight: 700;
        padding: 16px 12px;
        min-height: 64px;
        border: 3px solid #3498DB;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff, #EBF5FB);
        color: #2C3E50;
        cursor: pointer;
        touch-action: manipulation;
        transition: transform 0.1s, background 0.2s, opacity 0.3s;
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
    // Disable each button interactively
    this.buttons.forEach((btn) => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
    });

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

    // Update live region with a positive message
    if (this.liveRegion) {
      if (selectedIndex === correctIndex) {
        this.liveRegion.textContent = 'せいかい！ すごいね✨';
      } else {
        this.liveRegion.textContent = 'ざんねん。つぎがんばろう！';
      }
    }

    // If correct, show a small emoji celebration visual that auto-removes
    if (selectedIndex === correctIndex && this.container) {
      const emoji = document.createElement('span');
      emoji.className = 'choice-feedback-emoji';
      emoji.textContent = '✨';
      emoji.style.cssText = `
        position: absolute;
        left: 50%;
        top: 10px;
        transform: translateX(-50%) scale(0.6);
        font-size: 32px;
        pointer-events: none;
        transition: transform 600ms ease, opacity 600ms ease;
        opacity: 1;
      `;
      this.container.appendChild(emoji);

      // Trigger transform for animation (in browsers this would animate)
      // Use setTimeout to schedule the scale+fade and eventual removal
      setTimeout(() => {
        emoji.style.transform = 'translateX(-50%) scale(1.4)';
        emoji.style.opacity = '0';
      }, 20);

      // Remove after animation duration
      setTimeout(() => {
        emoji.remove();
      }, 700);
    }
  }

  showHint(correctIndex: number): void {
    if (this.disabled || this.buttons.length === 0) return;

    // Announce hint usage for screen reader
    if (this.liveRegion) this.liveRegion.textContent = 'ヒントを使ったよ';

    // Collect incorrect indices
    const incorrectIndices = this.buttons
      .map((_, i) => i)
      .filter(i => i !== correctIndex);

    // Shuffle using injected RNG to ensure determinism in tests
    for (let i = incorrectIndices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [incorrectIndices[i], incorrectIndices[j]] = [incorrectIndices[j], incorrectIndices[i]];
    }
    const toDim = incorrectIndices.slice(0, 2);

    toDim.forEach(i => {
      this.buttons[i].style.opacity = '0.3';
      this.buttons[i].style.pointerEvents = 'none';
    });
  }

  onSelect(callback: (index: number) => void): void {
    this.selectCallback = callback;
  }

  unmount(): void {
    this.container?.remove();
    this.container = null;
    this.liveRegion = null;
    this.buttons = [];
    this.selectCallback = null;
  }
}
