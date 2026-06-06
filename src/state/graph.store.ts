import { create } from 'zustand';

export type SocketType = 'flow' | 'data_string' | 'data_number' | 'data_boolean';

export interface GraphSocket {
  id: string;
  name: string;
  type: SocketType;
}

export interface GraphNode {
  id: string;
  type: string; // 'event_start', 'action_log', 'condition_if', etc.
  category: 'Event' | 'Action' | 'Condition' | 'Variable';
  label: string;
  x: number;
  y: number;
  color: string;
  inputs: GraphSocket[];
  outputs: GraphSocket[];
  data: Record<string, any>;
}

export interface GraphConnection {
  id: string;
  fromNode: string;
  fromSocket: string;
  toNode: string;
  toSocket: string;
}

interface GraphState {
  nodes: GraphNode[];
  connections: GraphConnection[];
  selectedNodeIds: string[];
  
  addNode: (node: GraphNode) => void;
  removeNodes: (nodeIds: string[]) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeData: (id: string, data: Record<string, any>) => void;
  
  addConnection: (conn: GraphConnection) => void;
  removeConnection: (id: string) => void;
  
  setSelectedNodes: (ids: string[]) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [
    {
      id: 'node_init',
      type: 'event_start',
      category: 'Event',
      label: 'On Scene Start',
      x: 100,
      y: 150,
      color: 'bg-emerald-900 border-emerald-700',
      inputs: [],
      outputs: [{ id: 'out_flow', name: 'Out', type: 'flow' }],
      data: {}
    }
  ],
  connections: [],
  selectedNodeIds: [],
  
  addNode: (node) => set(state => ({ nodes: [...state.nodes, node] })),
  removeNodes: (nodeIds) => set(state => ({
    nodes: state.nodes.filter(n => !nodeIds.includes(n.id)),
    connections: state.connections.filter(c => !nodeIds.includes(c.fromNode) && !nodeIds.includes(c.toNode)),
    selectedNodeIds: state.selectedNodeIds.filter(id => !nodeIds.includes(id))
  })),
  updateNodePosition: (id, x, y) => set(state => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, x, y } : n)
  })),
  updateNodeData: (id, data) => set(state => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
  })),
  
  addConnection: (conn) => set(state => ({ connections: [...state.connections, conn] })),
  removeConnection: (id) => set(state => ({ connections: state.connections.filter(c => c.id !== id) })),
  
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids })
}));
