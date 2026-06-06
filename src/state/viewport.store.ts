import { create } from 'zustand';

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  camera: { x: number; y: number; zoom: number };
  
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  setCamera: (x: number, y: number, zoom: number) => void;
  resetView: () => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  showGrid: true,
  snapToGrid: false,
  gridSize: 32,
  camera: { x: 0, y: 0, zoom: 1 },

  setZoom: (zoom) => set((state) => ({ 
    zoom, 
    camera: { ...state.camera, zoom } 
  })),
  setPan: (pan) => set({ pan }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setGridSize: (gridSize) => set({ gridSize }),
  setCamera: (x, y, zoom) => set({ 
    camera: { x, y, zoom },
    zoom
  }),
  resetView: () => set({
    zoom: 1,
    pan: { x: 0, y: 0 },
    camera: { x: 0, y: 0, zoom: 1 }
  })
}));
