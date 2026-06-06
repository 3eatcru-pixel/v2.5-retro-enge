export interface TileDefinition {
  id: number;
  name: string;
  color: string;
  isSolid: boolean;
  label: string;
  desc: string;
  u?: number; // X coordinate or column index in the spritesheet
  v?: number; // Y coordinate or row index in the spritesheet
  srcDataUri?: string; // Sliced base64 image representation of this tile
}

export interface Tileset {
  id: string;
  name: string;
  colorTheme: string;
  tiles: TileDefinition[];
  imageSrc?: string; // Optional loaded spritesheet PNG image (base64 or URL)
  tileWidth?: number; // Dimensions of individual tiles
  tileHeight?: number;
  columns?: number; // Total calculated column count
  rows?: number; // Total calculated row count
}

export const DEFAULT_TILESETS: Tileset[] = [
  {
    id: 'empty_tileset',
    name: '🎨 Custom Palette',
    colorTheme: 'slate',
    tiles: []
  }
];
