import { ComponentRegistry } from '../ComponentRegistry';

export interface Animator {
  type: 'animator';
  animations: Record<string, AnimationClip>;
  currentAnimation: string | null;
  frameIndex: number;
  timer: number;
  isPlaying: boolean;
  playbackRate: number;
}

export interface AnimationClip {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
  frameRate: number; // frames per second
}

export interface AnimationFrame {
  spriteId: string;
  duration?: number; // Optional frame-specific duration overriding the clip's framerate
}

export function createAnimator(animations: Record<string, AnimationClip> = {}): Animator {
  return {
    type: 'animator',
    animations,
    currentAnimation: null,
    frameIndex: 0,
    timer: 0,
    isPlaying: false,
    playbackRate: 1.0
  };
}

ComponentRegistry.register({
  name: 'animator',
  createDefault: createAnimator,
  fields: [
    { name: 'currentAnimation', type: 'string', label: 'Current' },
    { name: 'playbackRate', type: 'number', label: 'Rate' },
    { name: 'isPlaying', type: 'boolean', label: 'Playing' },
  ]
});
