const FADE_DURATION_MS = 250;

export class TransitionOverlay {
  private _el: HTMLDivElement | null = null;
  private _isTransitioning = false;
  private _fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
  private _fadeInTimer: ReturnType<typeof setTimeout> | null = null;

  mount(parent: HTMLElement): void {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      background: white;
      transition: opacity ${FADE_DURATION_MS}ms ease-in-out;
      will-change: opacity;
    `;
    parent.appendChild(el);
    this._el = el;
  }

  fadeOut(onComplete: () => void): void {
    if (this._isTransitioning || !this._el) return;
    this._isTransitioning = true;

    const el = this._el;
    el.style.pointerEvents = 'auto';
    el.style.opacity = '1';

    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      if (this._fadeOutTimer !== null) {
        clearTimeout(this._fadeOutTimer);
        this._fadeOutTimer = null;
      }
      onComplete();
    };

    const handler = (e: Event) => {
      if ((e as TransitionEvent).propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', handler);
      complete();
    };
    el.addEventListener('transitionend', handler);

    this._fadeOutTimer = setTimeout(() => {
      el.removeEventListener('transitionend', handler);
      complete();
    }, FADE_DURATION_MS);
  }

  fadeIn(): void {
    if (!this._el) return;

    const el = this._el;
    el.style.opacity = '0';

    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      if (this._fadeInTimer !== null) {
        clearTimeout(this._fadeInTimer);
        this._fadeInTimer = null;
      }
      el.style.pointerEvents = 'none';
      this._isTransitioning = false;
    };

    const handler = (e: Event) => {
      if ((e as TransitionEvent).propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', handler);
      complete();
    };
    el.addEventListener('transitionend', handler);

    this._fadeInTimer = setTimeout(() => {
      el.removeEventListener('transitionend', handler);
      complete();
    }, FADE_DURATION_MS);
  }

  isTransitioning(): boolean {
    return this._isTransitioning;
  }

  unmount(): void {
    if (this._fadeOutTimer !== null) {
      clearTimeout(this._fadeOutTimer);
      this._fadeOutTimer = null;
    }
    if (this._fadeInTimer !== null) {
      clearTimeout(this._fadeInTimer);
      this._fadeInTimer = null;
    }
    this._el?.remove();
    this._el = null;
    this._isTransitioning = false;
  }
}
