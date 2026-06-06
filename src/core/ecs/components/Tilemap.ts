import { ComponentRegistry } from '../ComponentRegistry';

export interface TilemapLayer {
  id: string;
  name: string;
  tiles: number[]; // Flat array of tile IDs (width * height). 0 means empty.
  visible: boolean;
  opacity: number;
  locked: boolean;
  type: 'tile' | 'collision';
}

export interface TilemapObject {
  id: string;
  type: string; // 'player' | 'enemy' | 'coin' | 'chest' | 'key' | 'camera'
  name: string;
  gridX: number;
  gridY: number;
  properties: Record<string, string>;
}

export interface Tilemap {
  tileSize: number;
  width: number;
  height: number;
  tiles: number[]; // Flat array of tile IDs (width * height) on active/legacy layer. 0 means empty.
  assetId: string | null; // Spritesheet or fallback
  layers: TilemapLayer[];
  objects: TilemapObject[];
  collisionMap: Record<number, { solid: boolean; name?: string; damage?: number; slow?: boolean }>;
}

export function createTilemap(width = 16, height = 12, tileSize = 32): Tilemap {
  const size = width * height;
  
  const backgroundLayer: TilemapLayer = {
    id: 'layer-bg',
    name: 'Background',
    tiles: new Array(size).fill(0),
    visible: true,
    opacity: 1,
    locked: false,
    type: 'tile'
  };

  const groundLayer: TilemapLayer = {
    id: 'layer-ground',
    name: 'Ground/Midground',
    tiles: new Array(size).fill(0),
    visible: true,
    opacity: 1,
    locked: false,
    type: 'tile'
  };

  const foregroundLayer: TilemapLayer = {
    id: 'layer-fore',
    name: 'Foreground',
    tiles: new Array(size).fill(0),
    visible: true,
    opacity: 1,
    locked: false,
    type: 'tile'
  };

  const collisionLayer: TilemapLayer = {
    id: 'layer-collision',
    name: 'Collision Grid',
    tiles: new Array(size).fill(0), // numbers corresponding to collision codes: 0=none, 1=solid block, 2=spikes/hazard, 3=water/slow
    visible: true,
    opacity: 0.6,
    locked: false,
    type: 'collision'
  };

  const collisionMap: Record<number, { solid: boolean; name?: string; damage?: number; slow?: boolean }> = {
    // Standard default tile configs
    1: { solid: true, name: 'Solid Wall' },
    2: { solid: true, name: 'Brick' },
    3: { solid: true, name: 'Steel Box' },
    4: { solid: false, name: 'Spikes', damage: 10 },
    5: { solid: false, name: 'Lava Pool', damage: 20 },
    6: { solid: true, name: 'Ice Column' },
    7: { solid: false, name: 'Water Swamps', slow: true },
    8: { solid: true, name: 'Door Entrance' },
    9: { solid: true, name: 'Forcefield Block' },
    10: { solid: true, name: 'Crate Wall' },
    11: { solid: true, name: 'Cobblestone Space' },
    12: { solid: true, name: 'Deep Ground' },
    13: { solid: true, name: 'Wood Box' },
    14: { solid: true, name: 'Border Hard Box' },
    15: { solid: false, name: 'Vines Climb' }
  };

  return {
    tileSize,
    width,
    height,
    tiles: groundLayer.tiles, // share reference for backward compatibility
    assetId: null,
    layers: [backgroundLayer, groundLayer, foregroundLayer, collisionLayer],
    objects: [],
    collisionMap
  };
}

ComponentRegistry.register({
  name: 'tilemap',
  createDefault: createTilemap as any,
  fields: [
    { name: 'width', type: 'number', label: 'Width' },
    { name: 'height', type: 'number', label: 'Height' },
    { name: 'tileSize', type: 'number', label: 'TileSize' },
    { name: 'assetId', type: 'asset', assetType: 'image', label: 'Asset ID' }
  ]
});
