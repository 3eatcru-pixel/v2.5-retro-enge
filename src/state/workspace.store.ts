import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspacePreset = 'general' | 'tiles' | 'anim' | 'sound' | 'logic' | 'diagnostics';
export type MainTabType = 'scene' | 'tilemap' | 'tileset' | 'sprite' | 'animation' | 'events' | 'ui' | 'profiler';
export type BottomTabType = 'assets' | 'audio' | 'logs' | 'plugins' | 'health';
export type LeftTabType = 'hierarchy' | 'creator';

interface WorkspaceState {
  activeWorkspace: WorkspacePreset;
  mainTab: MainTabType;
  bottomTab: BottomTabType;
  leftTab: LeftTabType;
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;

  setWorkspace: (preset: WorkspacePreset) => void;
  setMainTab: (tab: MainTabType) => void;
  setBottomTab: (tab: BottomTabType) => void;
  setLeftTab: (tab: LeftTabType) => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  setBottomOpen: (open: boolean) => void;
  
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspace: 'general' as WorkspacePreset,
      mainTab: 'scene' as MainTabType,
      bottomTab: 'assets' as BottomTabType,
      leftTab: 'hierarchy' as LeftTabType,
      leftOpen: true,
      rightOpen: true,
      bottomOpen: true,
      
      leftPanelWidth: 280,
      rightPanelWidth: 300,
      bottomPanelHeight: 288,

      setWorkspace: (preset) => set({ activeWorkspace: preset }),
      setMainTab: (tab) => set({ mainTab: tab }),
      setBottomTab: (tab) => set({ bottomTab: tab }),
      setLeftTab: (tab) => set({ leftTab: tab }),
      setLeftOpen: (open) => set({ leftOpen: open }),
      setRightOpen: (open) => set({ rightOpen: open }),
      setBottomOpen: (open) => set({ bottomOpen: open }),
      
      setLeftPanelWidth: (w) => set({ leftPanelWidth: Math.max(150, Math.min(w, 800)) }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: Math.max(150, Math.min(w, 800)) }),
      setBottomPanelHeight: (h) => set({ bottomPanelHeight: Math.max(100, Math.min(h, 800)) }),
    }),
    {
      name: 'retro-engine-workspace-storage',
      partialize: (state) => ({
        activeWorkspace: state.activeWorkspace,
        mainTab: state.mainTab,
        bottomTab: state.bottomTab,
        leftTab: state.leftTab,
        leftOpen: state.leftOpen,
        rightOpen: state.rightOpen,
        bottomOpen: state.bottomOpen,
        leftPanelWidth: state.leftPanelWidth,
        rightPanelWidth: state.rightPanelWidth,
        bottomPanelHeight: state.bottomPanelHeight,
      }),
    }
  )
);

