import { create } from 'zustand';

export interface Scene {
  id: string;
  name: string;
  entities: number[];
}

export interface SceneState {
  scenes: Record<string, Scene>;
  activeSceneId: string | null;
  setActiveScene: (id: string | null) => void;
  addScene: (scene: Scene) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: {
    'scene-main': { id: 'scene-main', name: 'Main Menu', entities: [] },
    'scene-level-1': { id: 'scene-level-1', name: 'Level 1', entities: [] }
  },
  activeSceneId: 'scene-main',
  setActiveScene: (id) => set({ activeSceneId: id }),
  addScene: (scene) => set((state) => ({ scenes: { ...state.scenes, [scene.id]: scene } })),
}));
