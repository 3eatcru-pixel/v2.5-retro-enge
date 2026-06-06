import { World } from '../World';
import { Animator } from '../components/Animator';
import { Sprite } from '../components/Sprite';
import { AnimationManager } from '../managers/AnimationManager';

export class AnimationSystem {
  constructor(private animationManager?: AnimationManager) {}

  update(world: World, dt: number): void {
    const animatedEntities = world.getEntitiesWith('sprite', 'animator');

    for (const entity of animatedEntities) {
      const animator = world.getComponent<Animator>(entity, 'animator');
      const sprite = world.getComponent<Sprite>(entity, 'sprite');

      if (!animator || !sprite || !animator.isPlaying || !animator.currentAnimation) continue;

      const clip = animator.animations[animator.currentAnimation];
      if (!clip) continue;

      animator.timer += dt * animator.playbackRate;

      // Determine time per frame
      const currentFrame = clip.frames[animator.frameIndex];
      const frameDuration = currentFrame?.duration || (1.0 / clip.frameRate);

      if (animator.timer >= frameDuration) {
        animator.timer -= frameDuration;
        animator.frameIndex++;

        if (animator.frameIndex >= clip.frames.length) {
          if (clip.loop) {
            animator.frameIndex = 0;
          } else {
            animator.frameIndex = clip.frames.length - 1;
            animator.isPlaying = false;
          }
        }
      }

      // Sync active frame's sprite asset and coordinates (slicing)
      const nextFrame = clip.frames[animator.frameIndex];
      if (nextFrame) {
        if (this.animationManager && this.animationManager.hasSequence(animator.currentAnimation)) {
          const seq = this.animationManager.getSequence(animator.currentAnimation)!;
          sprite.assetId = seq.spriteSheetAssetId;
          const coords = seq.frames[animator.frameIndex];
          if (coords) {
            sprite.frameX = coords.x;
            sprite.frameY = coords.y;
            sprite.frameWidth = coords.width;
            sprite.frameHeight = coords.height;
          }
        } else {
          // Standard slice / generic sub-rectangle slicing fallback
          if (this.animationManager) {
            this.animationManager.applyFrameToSprite(sprite, nextFrame.spriteId, clip);
          } else {
            // Inline parsing if AnimationManager is omitted
            const intIndex = typeof nextFrame.spriteId === 'number' 
              ? nextFrame.spriteId 
              : parseInt(nextFrame.spriteId as any, 10);
            if (!isNaN(intIndex) && String(intIndex) === String(nextFrame.spriteId)) {
              const frameW = sprite.frameWidth || 32;
              const frameH = sprite.frameHeight || 32;
              const cols = 16;
              sprite.frameX = (intIndex % cols) * frameW;
              sprite.frameY = Math.floor(intIndex / cols) * frameH;
              sprite.frameWidth = frameW;
              sprite.frameHeight = frameH;
            } else if (typeof nextFrame.spriteId === 'string') {
              const matchXY = nextFrame.spriteId.match(/^(.*?)_(\d+)_(\d+)$/);
              const matchIndex = nextFrame.spriteId.match(/^(.*?)_(\d+)$/);
              
              if (matchXY) {
                sprite.assetId = matchXY[1];
                const u = parseInt(matchXY[2], 10);
                const v = parseInt(matchXY[3], 10);
                const cellW = sprite.frameWidth || 16;
                const cellH = sprite.frameHeight || 16;
                sprite.frameX = u * cellW;
                sprite.frameY = v * cellH;
                sprite.frameWidth = cellW;
                sprite.frameHeight = cellH;
              } else if (matchIndex) {
                sprite.assetId = matchIndex[1];
                const idx = parseInt(matchIndex[2], 10);
                const cellW = sprite.frameWidth || 16;
                const cellH = sprite.frameHeight || 16;
                const cols = 4; // standard 4 columns per ninja character row group
                sprite.frameX = (idx % cols) * cellW;
                sprite.frameY = Math.floor(idx / cols) * cellH;
                sprite.frameWidth = cellW;
                sprite.frameHeight = cellH;
              } else {
                sprite.assetId = nextFrame.spriteId;
              }
            }
          }
        }
      }
    }
  }
}
