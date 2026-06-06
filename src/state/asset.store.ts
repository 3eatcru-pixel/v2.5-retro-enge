import { create } from 'zustand';
import { Tileset, DEFAULT_TILESETS } from '../core/resources/Tileset';

export interface AssetState {
  selectedAssetId: string | null;
  setSelectedAsset: (id: string | null) => void;
  tilesets: Tileset[];
  activeTilesetId: string;
  addTileset: (tileset: Tileset) => void;
  removeTileset: (id: string) => void;
  updateTileset: (tileset: Tileset) => void;
  setActiveTilesetId: (id: string) => void;
}

export const useAssetStore = create<AssetState>((set) => ({
  selectedAssetId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  tilesets: DEFAULT_TILESETS,
  activeTilesetId: DEFAULT_TILESETS[0].id,
  addTileset: (tileset) => set((state) => ({ tilesets: [...state.tilesets, tileset] })),
  removeTileset: (id) => set((state) => {
    const remaining = state.tilesets.filter(t => t.id !== id);
    const nextActive = state.activeTilesetId === id ? (remaining[0]?.id || '') : state.activeTilesetId;
    return {
      tilesets: remaining,
      activeTilesetId: nextActive
    };
  }),
  updateTileset: (tileset) => set((state) => ({
    tilesets: state.tilesets.map(t => t.id === tileset.id ? tileset : t)
  })),
  setActiveTilesetId: (id) => set({ activeTilesetId: id }),
}));
