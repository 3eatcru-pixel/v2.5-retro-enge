export type AssetType = 'image' | 'audio' | 'tileset' | 'animation' | 'prefab' | 'script';

export interface AssetMetadata {
  guid: string;
  type: AssetType;
  name: string;
  sourceUrl: string;
  importOptions?: AssetImportOptions;
  dependencies: string[]; // GUIDs of other assets it depends on
  version: number;
  tags?: string[]; // Optional tags for the asset browser search/filtering
  primaryType?: 'Sprite' | 'TileSet' | 'Audio' | 'Other';
  subCategory?: 'background' | 'character' | 'scenario' | 'tileset' | 'grid' | 'ui' | 'audio' | 'other';
}

export interface AssetImportOptions {
  // Image options
  frameWidth?: number;
  frameHeight?: number;
  spriteSheet?: {
    tileWidth: number;
    tileHeight: number;
    spacing?: number;
    margin?: number;
  };
  filterMode?: 'pixel_art' | 'linear';
  scaling?: number;

  // Audio options
  volume?: number;
  loop?: boolean;
  gain?: number;
  compression?: boolean;

  // Script & JSON options
  minify?: boolean;
  autoCompile?: boolean;
}

export interface Asset {
  metadata: AssetMetadata;
}
