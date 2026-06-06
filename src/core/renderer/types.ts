export interface Viewport {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface IRenderer {
  init(canvas: HTMLCanvasElement): void;
  clear(): void;
  beginFrame(): void;
  endFrame(): void;
  drawRect(x: number, y: number, width: number, height: number, color: string): void;
  drawImage(img: HTMLImageElement, x: number, y: number, width: number, height: number): void;
  drawImageSub(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  drawOutline(x: number, y: number, width: number, height: number, color: string, lineWidth?: number): void;
  drawText(text: string, x: number, y: number, color: string, font?: string): void;
  setCamera(x: number, y: number, zoom: number): void;
  getCamera(): { x: number, y: number, zoom: number };
}
