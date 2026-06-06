import { create } from 'zustand';

export interface ProjectState {
  projectName: string;
  projectId: string | null;
  mode: 'dashboard' | 'scene' | 'tilemap' | 'animation' | 'events' | 'ui' | 'audio';
  setProjectName: (name: string) => void;
  loadProject: (id: string, name: string) => void;
  setMode: (mode: 'dashboard' | 'scene' | 'tilemap' | 'animation' | 'events' | 'ui' | 'audio') => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: 'Untitled Project',
  projectId: null,
  mode: 'dashboard',
  setProjectName: (name) => set({ projectName: name }),
  loadProject: (id, name) => set({ projectId: id, projectName: name }),
  setMode: (mode) => set({ mode }),
}));
