export class GameLoop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;
  
  // Fixed physics/logic step: 60 FPS
  private fixedDeltaTime: number = 1 / 60; 
  // Max accumulated time to prevent "spiral of death" during lag
  private maxFrameTime: number = 0.25; 
  
  constructor(
    private update: (dt: number) => void,
    private render: (alpha: number) => void
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;
    
    let frameTime = (time - this.lastTime) / 1000;
    if (frameTime > this.maxFrameTime) {
        frameTime = this.maxFrameTime;
    }
    
    this.lastTime = time;
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDeltaTime) {
      this.update(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
    }

    const alpha = this.accumulator / this.fixedDeltaTime;
    this.render(alpha);

    this.animationId = requestAnimationFrame(this.loop);
  }
}
