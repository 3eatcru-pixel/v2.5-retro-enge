import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSelectionStore } from './selection.store';


export type EditorPanel = 'hierarchy' | 'inspector' | 'assets' | 'console';
export type EditorTheme = 'dark' | 'light' | 'retro';

export interface EditorState {
  selectedEntityId: number | null;
  activePanels: Record<EditorPanel, boolean>;
  activeTheme: EditorTheme;
  editorUpdateToken: number;
  entityNames: Record<number, string>;
  setSelectedEntity: (id: number | null) => void;
  togglePanel: (panel: EditorPanel) => void;
  setTheme: (theme: EditorTheme) => void;
  forceUpdate: () => void;
  setEntityName: (id: number, name: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      selectedEntityId: null,
      activePanels: {
        hierarchy: true,
        inspector: true,
        assets: true,
        console: false
      },
      activeTheme: 'dark',
      editorUpdateToken: 0,
      entityNames: {},
      setSelectedEntity: (id) => set({ selectedEntityId: id }),
      togglePanel: (panel) => set((state) => ({
        activePanels: { ...state.activePanels, [panel]: !state.activePanels[panel] }
      })),
      setTheme: (theme) => set({ activeTheme: theme }),
      forceUpdate: () => set((state) => ({ editorUpdateToken: state.editorUpdateToken + 1 })),
      setEntityName: (id, name) => set((state) => ({
        entityNames: { ...state.entityNames, [id]: name }
      })),
    }),
    {
      name: 'retro-engine-editor-layout',
      partialize: (state) => ({ activePanels: state.activePanels, activeTheme: state.activeTheme, entityNames: state.entityNames }),
    }
  )
);

