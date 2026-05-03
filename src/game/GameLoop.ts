export class GameLoop {
  private animationId: number | null = null;
  private running = false;
  private lastTime = 0;
  private visibilityListener: (() => void) | null = null;
  private visibilityPaused = false;

  start(
    onUpdate: (deltaTime: number) => void,
    onRender: () => void,
  ): void {
    // Register visibility listener once per lifecycle
    if (this.visibilityListener === null) {
      // Capture callbacks so listener can resume using them
      this.visibilityListener = () => {
        try {
          if (document.visibilityState === 'hidden') {
            this.pauseForVisibility();
          } else {
            // When becoming visible, resume the loop
            this.resume(onUpdate, onRender);
          }
        } catch (e) {
          // In some test envs document may be unavailable/mutable; swallow errors
        }
      };
      document.addEventListener('visibilitychange', this.visibilityListener);
    }

    // If page is hidden, do not start RAF; mark as visibility-paused
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.visibilityPaused = true;
      this.running = false;
      this.lastTime = performance.now();
      return;
    }

    this.visibilityPaused = false;
    this.running = true;
    this.lastTime = performance.now();

    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      onUpdate(dt);
      onRender();
      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private pauseForVisibility(): void {
    // Pause due to visibility change but keep listener registered so we can resume
    if (!this.running) {
      this.visibilityPaused = true;
      return;
    }
    this.running = false;
    this.visibilityPaused = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  pause(): void {
    // External pause: stop loop and unregister visibility listener
    this.running = false;
    this.visibilityPaused = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.visibilityListener) {
      try {
        document.removeEventListener('visibilitychange', this.visibilityListener);
      } catch (e) {
        // ignore
      }
      this.visibilityListener = null;
    }
  }

  resume(
    onUpdate: (deltaTime: number) => void,
    onRender: () => void,
  ): void {
    // Do not resume if the document is hidden
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.visibilityPaused = true;
      return;
    }
    if (this.running) return;
    // Reset timing to avoid large dt after hidden
    this.lastTime = performance.now();
    this.visibilityPaused = false;
    // Start will reuse existing listener if present
    this.start(onUpdate, onRender);
  }

  stop(): void {
    this.pause();
  }
}
