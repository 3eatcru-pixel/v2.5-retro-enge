import { World } from '../World';
import { Animator, AnimationClip } from '../components/Animator';
import { Sprite } from '../components/Sprite';

export interface FrameCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteSheetSequence {
  name: string;
  spriteSheetAssetId: string;
  frames: FrameCoordinates[];
  loop: boolean;
  frameRate: number;
}

export class AnimationManager {
  private sequences = new Map<string, SpriteSheetSequence>();

  constructor() {}

  /**
   * Registers a frame-based animation sequence for a specific sprite sheet.
   */
  public registerSequence(name: string, sequence: SpriteSheetSequence): void {
    this.sequences.set(name, sequence);
  }

  /**
   * Retrieves a registered frame-based animation sequence.
   */
  public getSequence(name: string): SpriteSheetSequence | undefined {
    return this.sequences.get(name);
  }

  /**
   * Checks if an animation sequence exists.
   */
  public hasSequence(name: string): boolean {
    return this.sequences.has(name);
  }

  /**
   * Registers a grid-based animation sequence where we pass keyframes as sequential indices
   * (e.g., columns) on a grid of specific cell size.
   */
  public registerGridSequence(
    name: string,
    spriteSheetAssetId: string,
    options: {
      columnsCount: number;
      cellWidth: number;
      cellHeight: number;
      frameIndices: number[];
      loop: boolean;
      frameRate: number;
    }
  ): void {
    const frames: FrameCoordinates[] = options.frameIndices.map((idx) => {
      const u = idx % options.columnsCount;
      const v = Math.floor(idx / options.columnsCount);
      return {
        x: u * options.cellWidth,
        y: v * options.cellHeight,
        width: options.cellWidth,
        height: options.cellHeight,
      };
    });

    this.registerSequence(name, {
      name,
      spriteSheetAssetId,
      frames,
      loop: options.loop,
      frameRate: options.frameRate,
    });
  }

  /**
   * Play an animation on an entity with Animator and Sprite components.
   */
  public play(
    world: World,
    entity: number,
    animationName: string,
    options?: { loop?: boolean; speed?: number }
  ): void {
    const animator = world.getComponent<Animator>(entity, 'animator');
    const sprite = world.getComponent<Sprite>(entity, 'sprite');

    if (!animator) {
      console.warn(`[AnimationManager] Entity ${entity} does not have an Animator component.`);
      return;
    }

    // Adjust playback settings if provided
    if (options && options.speed !== undefined) {
      animator.playbackRate = options.speed;
    }

    // 1. If playing a registered SpriteSheet sequence, initialize it!
    if (this.hasSequence(animationName)) {
      const sequence = this.getSequence(animationName)!;
      
      // Ensure the clip is defined on the Animator so its state transitions correctly
      if (!animator.animations[animationName]) {
        animator.animations[animationName] = {
          name: animationName,
          frames: sequence.frames.map((_, idx) => ({
            spriteId: `${animationName}_frame_${idx}`,
          })),
          loop: options?.loop !== undefined ? options.loop : sequence.loop,
          frameRate: sequence.frameRate,
        };
      }

      animator.currentAnimation = animationName;
      animator.frameIndex = 0;
      animator.timer = 0;
      animator.isPlaying = true;

      // Apply initial frame geometry immediately to sprite
      if (sprite) {
        sprite.assetId = sequence.spriteSheetAssetId;
        const initialCoords = sequence.frames[0];
        if (initialCoords) {
          sprite.frameX = initialCoords.x;
          sprite.frameY = initialCoords.y;
          sprite.frameWidth = initialCoords.width;
          sprite.frameHeight = initialCoords.height;
        }
      }
      return;
    }

    // 2. Play standard clip registered directly on the Animator
    const clip = animator.animations[animationName];
    if (clip) {
      animator.currentAnimation = animationName;
      animator.frameIndex = 0;
      animator.timer = 0;
      animator.isPlaying = true;
      if (options?.loop !== undefined) {
        clip.loop = options.loop;
      }

      // Apply initial sprite source immediately
      if (sprite && clip.frames.length > 0) {
        const firstFrame = clip.frames[0];
        if (firstFrame) {
          this.applyFrameToSprite(sprite, firstFrame.spriteId, clip);
        }
      }
    } else {
      console.warn(`[AnimationManager] Animation "${animationName}" not found in AnimationManager or Animator configuration.`);
    }
  }

  /**
   * Stop target entity animation.
   */
  public stop(world: World, entity: number): void {
    const animator = world.getComponent<Animator>(entity, 'animator');
    if (animator) {
      animator.isPlaying = false;
      animator.frameIndex = 0;
      animator.timer = 0;
    }
  }

  /**
   * Pause target entity animation.
   */
  public pause(world: World, entity: number): void {
    const animator = world.getComponent<Animator>(entity, 'animator');
    if (animator) {
      animator.isPlaying = false;
    }
  }

  /**
   * Resume target entity animation.
   */
  public resume(world: World, entity: number): void {
    const animator = world.getComponent<Animator>(entity, 'animator');
    if (animator && animator.currentAnimation) {
      animator.isPlaying = true;
    }
  }

  /**
   * Set speed / playbackRate of target entity animation clip.
   */
  public setSpeed(world: World, entity: number, playbackRate: number): void {
    const animator = world.getComponent<Animator>(entity, 'animator');
    if (animator) {
      animator.playbackRate = playbackRate;
    }
  }

  /**
   * Helper function to apply a string/id frame or numerical frame index onto a Sprite,
   * parsing sheet coordinates automatically from the format.
   */
  public applyFrameToSprite(sprite: Sprite, spriteId: any, _clip?: AnimationClip): void {
    if (spriteId === undefined || spriteId === null) return;

    // A. Parse if frame is an index number directly or is an integer string representing a sequence index
    const intIndex = typeof spriteId === 'number' 
      ? spriteId 
      : parseInt(spriteId, 10);

    if (!isNaN(intIndex) && String(intIndex) === String(spriteId)) {
      // Numerical frame index on sprite sheet
      const frameW = sprite.frameWidth || 32;
      const frameH = sprite.frameHeight || 32;
      const cols = 16; 
      sprite.frameX = (intIndex % cols) * frameW;
      sprite.frameY = Math.floor(intIndex / cols) * frameH;
      sprite.frameWidth = frameW;
      sprite.frameHeight = frameH;
      return;
    }

    // Parse if string is like 'assets/.../1.png_3'
    const pngMatch = typeof spriteId === 'string' && spriteId.match(/^(.*\.png)_(\d+)$/);
    if (pngMatch) {
      sprite.assetId = pngMatch[1];
      const intIndex = parseInt(pngMatch[2], 10);
      
      let cols = 4;
      let fw = sprite.frameWidth || 32;
      let fh = sprite.frameHeight || 32;

      // Automatically handle ninja adventure character dimensions
      if (sprite.assetId.includes('ninja-adventure/characters/')) {
         fw = 16;
         fh = 28;
         cols = 4;
      }
      
      sprite.frameX = (intIndex % cols) * fw;
      sprite.frameY = Math.floor(intIndex / cols) * fh;
      sprite.frameWidth = fw;
      sprite.frameHeight = fh;
      return;
    }

    if (typeof spriteId !== 'string') return;

    // B. Parse if tileset tile reference like "grassland_tile_1"
    if (spriteId.includes('_tile_')) {
      const parts = spriteId.split('_tile_');
      if (parts.length === 2) {
        const tileIdx = parseInt(parts[1], 10);
        const tileWidth = 16; // Standard tile sizes
        const tileHeight = 16;
        const columns = 16;
        
        sprite.frameX = (tileIdx % columns) * tileWidth;
        sprite.frameY = Math.floor(tileIdx / columns) * tileHeight;
        sprite.frameWidth = tileWidth;
        sprite.frameHeight = tileHeight;
        return;
      }
    }

    // C. Parse if cell indices inside custom slice (e.g., custom_char_0_0 or hero_idle_3_2)
    // Extract column (u) and row (v) matching ending parameters "_u_v" or "_u-v"
    const match = spriteId.match(/(.*)_(\d+)_(\d+)$/);
    if (match) {
      const extractedAssetId = match[1];
      const u = parseInt(match[2], 10);
      const v = parseInt(match[3], 10);
      const cellW = sprite.frameWidth || 32;
      const cellH = sprite.frameHeight || 32;

      if (extractedAssetId) {
        sprite.assetId = extractedAssetId;
      }
      
      sprite.frameX = u * cellW;
      sprite.frameY = v * cellH;
      sprite.frameWidth = cellW;
      sprite.frameHeight = cellH;
    }
  }
}
