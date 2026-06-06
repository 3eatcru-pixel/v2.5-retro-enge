import { IRenderer } from './types';

export class CanvasRenderer implements IRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private cameraX = 0;
  private cameraY = 0;
  private cameraZoom = 1;

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false }); // alpha: false for slight optimization
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false; // Essential for pixel art
    }
  }

  public clear(): void {
    if (!this.ctx || !this.canvas) return;
    this.ctx.fillStyle = '#111111'; // Base retro dark background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public beginFrame(): void {
    if (!this.ctx) return;
    this.ctx.save();
    
    // Ensure image smoothing is disabled consistently across frames
    this.ctx.imageSmoothingEnabled = false;
    
    // Apply camera transform
    if (this.canvas) {
      const hw = this.canvas.width / 2;
      const hh = this.canvas.height / 2;
      this.ctx.translate(hw, hh);
      this.ctx.scale(this.cameraZoom, this.cameraZoom);
      this.ctx.translate(-this.cameraX, -this.cameraY);
    }
  }

  public endFrame(): void {
    if (!this.ctx) return;
    this.ctx.restore();
  }

  public isVisible(x: number, y: number, width: number, height: number): boolean {
    if (!this.canvas) return true; // Fail open if no canvas
    const viewWidth = this.canvas.width / this.cameraZoom;
    const viewHeight = this.canvas.height / this.cameraZoom;
    const viewX = this.cameraX - viewWidth / 2;
    const viewY = this.cameraY - viewHeight / 2;
    
    const minX = Math.min(x, x + width);
    const maxX = Math.max(x, x + width);
    const minY = Math.min(y, y + height);
    const maxY = Math.max(y, y + height);
    
    return (
      minX <= viewX + viewWidth &&
      maxX >= viewX &&
      minY <= viewY + viewHeight &&
      maxY >= viewY
    );
  }

  public drawRect(x: number, y: number, width: number, height: number, color: string): void {
    if (!this.ctx || !this.isVisible(x, y, width, height)) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  public drawImage(img: HTMLImageElement, x: number, y: number, width: number, height: number): void {
    if (!this.ctx || !this.isVisible(x, y, width, height)) return;
    this.ctx.drawImage(img, x, y, width, height);
  }

  public drawImageSub(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
    if (!this.ctx || !this.isVisible(dx, dy, dw, dh)) return;
    this.ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  public drawOutline(x: number, y: number, width: number, height: number, color: string, lineWidth = 2): void {
    if (!this.ctx || !this.isVisible(x, y, width, height)) return;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth / this.cameraZoom;
    this.ctx.strokeRect(x, y, width, height);
  }
  
  public drawText(text: string, x: number, y: number, color: string, font = '10px monospace'): void {
    if (!this.ctx || !this.isVisible(x, y, 100, 20)) return; // Approximate text size
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  public setCamera(x: number, y: number, zoom: number): void {
    this.cameraX = x;
    this.cameraY = y;
    this.cameraZoom = zoom;
  }
  
  public getCamera() {
    return { x: this.cameraX, y: this.cameraY, zoom: this.cameraZoom };
  }
}
