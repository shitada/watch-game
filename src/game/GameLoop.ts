export class GameLoop {
  private animationId: number | null = null;
  private running = false;
  private lastTime = 0;

  start(
    onUpdate: (deltaTime: number) => void,
    onRender: () => void,
  ): void {
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

  pause(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume(
    onUpdate: (deltaTime: number) => void,
    onRender: () => void,
  ): void {
    if (!this.running) {
      this.start(onUpdate, onRender);
    }
  }

  stop(): void {
    this.pause();
  }
}
