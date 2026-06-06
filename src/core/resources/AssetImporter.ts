import { AssetMetadata, AssetType, AssetImportOptions } from './AssetMetadata';

function isCrossOrigin(url: string): boolean {
  if (!url) return false;
  try {
    if (typeof window === 'undefined') return false;
    const origin = window.location.origin;
    const parsed = new URL(url, window.location.href);
    return parsed.origin !== origin;
  } catch (e) {
    return false;
  }
}

export type ImportedImageData = HTMLImageElement;
export type ImportedAudioData = { buffer: ArrayBuffer; volume: number; loop: boolean };
export type ImportedTilesetData = { 
  metadata: { 
    tileWidth: number; 
    tileHeight: number; 
    spacing: number; 
    margin: number; 
    columns: number; 
    rows: number; 
  }; 
  image?: HTMLImageElement; 
};
export type ImportedPrefabData = { nestedPrefabs?: string[]; [key: string]: any };
export type ImportedScriptData = string;

export type ImportedDataMap = {
  'image': ImportedImageData;
  'audio': ImportedAudioData;
  'tileset': ImportedTilesetData;
  'prefab': ImportedPrefabData;
  'script': ImportedScriptData;
  'animation': any; 
};

export interface ImportResult<T extends AssetType = AssetType> {
  guid: string;
  sourceUrl: string;
  importedData: ImportedDataMap[T] | null;
  dependencies: string[];
  contentHash: string;
}

export class AssetImporter {
  /**
   * Generates a fast, non-cryptographic hash string for cache-busting.
   */
  private static computeHash(data: ArrayBuffer | string | HTMLImageElement): string {
    if (typeof data === 'string') {
      return this.hashString(data);
    } else if (data instanceof ArrayBuffer) {
      return this.hashBuffer(data);
    } else if (data instanceof HTMLImageElement) {
      return this.hashString(data.src || 'img');
    }
    return '0000000';
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return hash.toString(16);
  }

  private static hashBuffer(buffer: ArrayBuffer): string {
    const view = new Uint8Array(buffer);
    let hash = 0;
    const step = Math.max(1, Math.floor(view.length / 1000));
    for (let i = 0; i < view.length; i += step) {
      hash = ((hash << 5) - hash) + view[i];
      hash = hash & hash;
    }
    return hash.toString(16) + '_' + view.length;
  }

  /**
   * Primary entry point to import an asset. Processes the data based on metadata type and importOptions.
   */
  public static async importAsset<T extends AssetType>(
    metadata: AssetMetadata,
    rawBuffer: ArrayBuffer | string | HTMLImageElement
  ): Promise<ImportResult<T>> {
    const { guid, type, sourceUrl, importOptions } = metadata;
    const dependencies: string[] = [...metadata.dependencies];
    const contentHash = this.computeHash(rawBuffer);

    let importedData: any = null;

    switch (type) {
      case 'image':
        importedData = await this.importImage(rawBuffer, importOptions);
        break;
      case 'audio':
        importedData = await this.importAudio(rawBuffer, importOptions);
        break;
      case 'tileset':
        importedData = await this.importTileset(rawBuffer, importOptions);
        break;
      case 'prefab':
        importedData = await this.importPrefab(rawBuffer, importOptions);
        // Extract embedded prefab references from the prefab data
        if (importedData && Array.isArray(importedData.nestedPrefabs)) {
          dependencies.push(...importedData.nestedPrefabs);
        }
        break;
      case 'script':
      default:
        importedData = typeof rawBuffer === 'string' ? rawBuffer : new TextDecoder().decode(rawBuffer as ArrayBuffer);
        break;
    }

    return {
      guid,
      sourceUrl,
      importedData,
      dependencies: Array.from(new Set(dependencies)),
      contentHash
    };
  }

  /**
   * Image-specific import pipeline (supports filters, scaling)
   */
  private static async importImage(
    data: ArrayBuffer | string | HTMLImageElement,
    options?: AssetImportOptions
  ): Promise<ImportedImageData> {
    return new Promise((resolve, reject) => {
      if (data instanceof HTMLImageElement) {
        this.applyImageFilter(data, options);
        resolve(data);
        return;
      }

      const img = new Image();
      if (typeof data === 'string' && isCrossOrigin(data)) {
        img.crossOrigin = 'Anonymous';
      }
      img.onload = () => {
        this.applyImageFilter(img, options);
        resolve(img);
      };
      img.onerror = () => reject(new Error('Failed to parse image data during import'));

      if (data instanceof ArrayBuffer) {
        const blob = new Blob([data], { type: 'image/png' });
        img.src = URL.createObjectURL(blob);
      } else if (typeof data === 'string') {
        let cleanData = data;
        if (cleanData && !cleanData.startsWith('/') && !cleanData.startsWith('http://') && !cleanData.startsWith('https://') && !cleanData.startsWith('data:')) {
          cleanData = '/' + cleanData;
        }
        img.src = cleanData;
      } else {
        reject(new Error('Invalid image import data format'));
      }
    });
  }

  private static applyImageFilter(img: HTMLImageElement, options?: AssetImportOptions) {
    const mode = options?.filterMode || 'pixel_art';
    if (mode === 'pixel_art') {
      img.style.imageRendering = 'pixelated';
      // Retro-styled pixel artwork
    } else {
      img.style.imageRendering = 'auto';
    }
  }

  /**
   * Audio-specific import pipeline
   */
  private static async importAudio(
    data: ArrayBuffer | string | HTMLImageElement,
    options?: AssetImportOptions
  ): Promise<ImportedAudioData> {
    const volume = typeof options?.volume === 'number' ? options.volume : 1.0;
    const loop = !!options?.loop;

    let buffer: ArrayBuffer;
    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (typeof data === 'string') {
      const response = await fetch(data);
      buffer = await response.arrayBuffer();
    } else {
      throw new Error('Unsupported audio import format');
    }

    return {
      buffer,
      volume,
      loop
    };
  }

  /**
   * Tileset-specific import pipeline: cuts sheet up, configures properties
   */
  private static async importTileset(
    data: ArrayBuffer | string | HTMLImageElement,
    options?: AssetImportOptions
  ): Promise<ImportedTilesetData> {
    const tileW = options?.spriteSheet?.tileWidth || 32;
    const tileH = options?.spriteSheet?.tileHeight || 32;
    const spacing = options?.spriteSheet?.spacing || 0;
    const margin = options?.spriteSheet?.margin || 0;

    let image: HTMLImageElement | undefined;
    if (data) {
      image = await this.importImage(data, { filterMode: 'pixel_art' });
    }

    return {
      metadata: {
        tileWidth: tileW,
        tileHeight: tileH,
        spacing,
        margin,
        columns: image ? Math.floor((image.width - margin * 2 + spacing) / (tileW + spacing)) : 1,
        rows: image ? Math.floor((image.height - margin * 2 + spacing) / (tileH + spacing)) : 1,
      },
      image
    };
  }

  /**
   * Prefab-specific deserializer
   */
  private static async importPrefab(
    data: ArrayBuffer | string | HTMLImageElement,
    _options?: AssetImportOptions
  ): Promise<ImportedPrefabData> {
    let rawObj: any = data;
    if (typeof data === 'string') {
      rawObj = JSON.parse(data);
    } else if (data instanceof ArrayBuffer) {
      const decoder = new TextDecoder();
      rawObj = JSON.parse(decoder.decode(data));
    }
    return rawObj;
  }
}

