import { PlatformAdapter } from '../PlatformAdapter';
import { RetroStorage } from '../../core/storage/RetroStorage';

export class WebPlatformAdapter implements PlatformAdapter {
  type: 'web' | 'desktop' | 'mobile' = 'web';

  async init(): Promise<void> {
    // RetroStorage gets lazily initialized on first storage query, but we can verify it here
    console.log('Web platform initialized (Unified High-Capacity RetroStorage online)');
  }

  async saveData(key: string, data: string): Promise<void> {
    await RetroStorage.setItem(key, data);
  }

  async loadData(key: string): Promise<string | null> {
    return await RetroStorage.getItem(key);
  }

  quit(): void {
    console.warn('Cannot quit on web platform');
  }
}


