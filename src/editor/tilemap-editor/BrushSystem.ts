import { TilemapLayer } from '../../core/ecs/components/Tilemap';

export type BrushMode = 'pencil' | 'eraser';

export interface BrushOptions {
  size: number;
  autotileEnabled?: boolean;
}

/**
 * Handles pointer-based continuous drawing, cell resolution and modifications on tile layers
 * matching structural bounds (Pencil & Eraser behavior).
 */
export class BrushSystem {
  private isDrawing: boolean = false;
  private lastGridCell: { x: number; y: number } | null = null;

  /**
   * Initializes or begins a continuous drawing stroke sequence.
   */
  public beginStroke(gridX: number, gridY: number): void {
    this.isDrawing = true;
    this.lastGridCell = { x: gridX, y: gridY };
  }

  /**
   * Checks if pointer is actively dragging down.
   */
  public isActive(): boolean {
    return this.isDrawing;
  }

  /**
   * Resets trigger variables.
   */
  public endStroke(): void {
    this.isDrawing = false;
    this.lastGridCell = null;
  }

  /**
   * Checks if target grid is redundant to last drawn coordinates.
   */
  public shouldPaintCell(gridX: number, gridY: number): boolean {
    if (!this.isDrawing) return false;
    if (this.lastGridCell && this.lastGridCell.x === gridX && this.lastGridCell.y === gridY) {
      return false;
    }
    this.lastGridCell = { x: gridX, y: gridY };
    return true;
  }

  /**
   * Applies pencil or eraser mutations inside layer limits.
   * Returns true if any tile has changed.
   */
  public applyBrush(
    layer: TilemapLayer,
    gridX: number,
    gridY: number,
    compWidth: number,
    compHeight: number,
    tileId: number,
    mode: BrushMode,
    options: BrushOptions,
    onAutotile?: (lx: number, ly: number) => void
  ): boolean {
    if (layer.locked) return false;

    // Eraser always targets void index (0), pencil targets specified brush palette ID
    const valueToPaint = mode === 'eraser' ? 0 : tileId;
    const brushSize = Math.max(1, options.size || 1);

    let amended = false;

    // Direct single pixel draw
    if (brushSize === 1) {
      if (gridX >= 0 && gridX < compWidth && gridY >= 0 && gridY < compHeight) {
        const idx = gridY * compWidth + gridX;
        if (layer.tiles[idx] !== valueToPaint) {
          layer.tiles[idx] = valueToPaint;
          amended = true;
        }
        if (onAutotile && options.autotileEnabled) {
          onAutotile(gridX, gridY);
        }
      }
    } else {
      // Large brush cluster sizes support
      const half = Math.floor(brushSize / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const bx = gridX + dx;
          const by = gridY + dy;
          if (bx >= 0 && bx < compWidth && by >= 0 && by < compHeight) {
            const idx = by * compWidth + bx;
            if (layer.tiles[idx] !== valueToPaint) {
              layer.tiles[idx] = valueToPaint;
              amended = true;
            }
            if (onAutotile && options.autotileEnabled) {
              onAutotile(bx, by);
            }
          }
        }
      }
    }

    return amended;
  }
}
