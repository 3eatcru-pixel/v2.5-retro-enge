import { create } from 'zustand';

export interface SelectionState {
  selectedEntityId: number | null;
  hoveredEntityId: number | null;
  selectedEntityIds: number[];
  
  setSelectedEntity: (id: number | null) => void;
  setHoveredEntity: (id: number | null) => void;
  toggleEntitySelection: (id: number) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedEntityId: null,
  hoveredEntityId: null,
  selectedEntityIds: [],

  setSelectedEntity: (id) => set((state) => ({
    selectedEntityId: id,
    selectedEntityIds: id !== null ? [id] : []
  })),
  
  setHoveredEntity: (id) => set({ hoveredEntityId: id }),
  
  toggleEntitySelection: (id) => set((state) => {
    const isSelected = state.selectedEntityIds.includes(id);
    const nextIds = isSelected
      ? state.selectedEntityIds.filter(x => x !== id)
      : [...state.selectedEntityIds, id];
    return {
      selectedEntityIds: nextIds,
      selectedEntityId: nextIds.length > 0 ? nextIds[nextIds.length - 1] : null
    };
  }),
  
  clearSelection: () => set({
    selectedEntityId: null,
    selectedEntityIds: [],
    hoveredEntityId: null
  })
}));
