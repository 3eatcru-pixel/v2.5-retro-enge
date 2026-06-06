import { create } from 'zustand';
import { Engine } from '../core/engine-core/Engine';

export interface EngineState {
  engine: Engine | null;
  setEngine: (engine: Engine | null) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  engine: null,
  setEngine: (engine) => set({ engine }),
}));
