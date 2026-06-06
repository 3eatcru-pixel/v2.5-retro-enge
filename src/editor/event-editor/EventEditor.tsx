import { Network, Trash2, Zap, Play, Workflow, Database, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useRef } from 'react';
import { pushConsoleLog } from '../console-panel/ConsolePanel';
import { useGraphStore, GraphNode, GraphSocket } from '../../state/graph.store';

export function EventEditor() {
  const nodes = useGraphStore((state) => state.nodes);
  const connections = useGraphStore((state) => state.connections);
  const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds);
  const addNode = useGraphStore((state) => state.addNode);
  const removeNodes = useGraphStore((state) => state.removeNodes);
  const updateNodePosition = useGraphStore((state) => state.updateNodePosition);
  const addConnection = useGraphStore((state) => state.addConnection);
  const setSelectedNodes = useGraphStore((state) => state.setSelectedNodes);
  const updateNodeData = useGraphStore((state) => state.updateNodeData);

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const dragRef = useRef<{ startX: number, startY: number, nodesInitial: {id: string, x: number, y: number}[] } | null>(null);

  // Connection dragging
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string, socketId: string } | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number, y: number } | null>(null);
  
  // Panning & Zoom Support
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointerDownBackground = (e: React.PointerEvent) => {
    setSelectedNodes([]);
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMovePath = (e: React.PointerEvent) => {
    if (isDraggingNode && dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      dragRef.current.nodesInitial.forEach(n => {
        updateNodePosition(n.id, Math.round(n.x + dx), Math.round(n.y + dy));
      });
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }

    if (connectingFrom && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDragPointer({
        // Scale pointer position back to logical coordinates based on active zoom and pan
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handlePointerUpPath = (e: React.PointerEvent) => {
    if (isDraggingNode) {
      setIsDraggingNode(false);
      dragRef.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
    }
    if (connectingFrom) {
      setConnectingFrom(null);
      setDragPointer(null);
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleNodePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    let newSelection = [...selectedNodeIds];
    if (!newSelection.includes(id)) {
      if (e.shiftKey) {
        newSelection.push(id);
      } else {
        newSelection = [id];
      }
    }
    setSelectedNodes(newSelection);
    
    setIsDraggingNode(true);
    const initialPos = newSelection.map(selId => {
      const n = nodes.find(n => n.id === selId)!;
      return { id: selId, x: n.x, y: n.y };
    });
    
    dragRef.current = { startX: e.clientX, startY: e.clientY, nodesInitial: initialPos };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSocketPointerDown = (nodeId: string, socketId: string, isOutput: boolean, e: React.PointerEvent) => {
    e.stopPropagation();
    if (isOutput) {
      setConnectingFrom({ nodeId, socketId });
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setDragPointer({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom
        });
      }
    }
  };

  const handleSocketPointerUp = (nodeId: string, socketId: string, isOutput: boolean, e: React.PointerEvent) => {
    e.stopPropagation();
    if (connectingFrom && !isOutput && connectingFrom.nodeId !== nodeId) {
      // Create connection
      if (!connections.find(c => c.fromSocket === connectingFrom.socketId && c.toSocket === socketId)) {
        addConnection({
          id: `conn_${Math.random()}`,
          fromNode: connectingFrom.nodeId,
          fromSocket: connectingFrom.socketId,
          toNode: nodeId,
          toSocket: socketId
        });
        pushConsoleLog('success', 'EVENT_EDITOR', `Bound Socket [${connectingFrom.nodeId}] to [${nodeId}]`);
      }
    }
    setConnectingFrom(null);
    setDragPointer(null);
  };

  const spawnNode = (typeId: string, category: GraphNode['category']) => {
    const type = typeId;
    let label = 'New Node';
    let color = 'bg-neutral-800 border-neutral-700 text-neutral-300';
    let inputs: GraphSocket[] = [];
    let outputs: GraphSocket[] = [];
    let data: Record<string, any> = {};

    switch(typeId) {
      // EVENTS
      case 'event_start':
        label = 'On Scene Start'; color = 'bg-emerald-900 border-emerald-700 text-emerald-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }];
        break;
      case 'event_update':
        label = 'On Update'; color = 'bg-emerald-900 border-emerald-700 text-emerald-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }, { id: `sock_${Math.random()}`, name: 'Delta Time', type: 'data_number' }];
        break;
      case 'event_interaction':
        label = 'On Interaction'; color = 'bg-emerald-900 border-emerald-700 text-emerald-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }];
        break;
      case 'event_collision':
        label = 'On Collision'; color = 'bg-emerald-900 border-emerald-700 text-emerald-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }, { id: `sock_${Math.random()}`, name: 'Other Entity', type: 'data_number' }];
        break;
        
      // ACTIONS
      case 'action_play_audio':
        label = 'Play Audio'; color = 'bg-indigo-900 border-indigo-700 text-indigo-100';
        inputs = [{ id: `sock_${Math.random()}`, name: 'In', type: 'flow' }];
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }];
        data = { soundId: '' };
        break;
      case 'action_log':
        label = 'Log Message'; color = 'bg-indigo-900 border-indigo-700 text-indigo-100';
        inputs = [{ id: `sock_${Math.random()}`, name: 'In', type: 'flow' }, { id: `sock_${Math.random()}`, name: 'Message', type: 'data_string' }];
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }];
        break;
      case 'action_move':
        label = 'Move Entity'; color = 'bg-indigo-900 border-indigo-700 text-indigo-100';
        inputs = [{ id: `sock_${Math.random()}`, name: 'In', type: 'flow' }, { id: `sock_${Math.random()}`, name: 'Entity ID', type: 'data_number' }, { id: `sock_${Math.random()}`, name: 'X', type: 'data_number' }, { id: `sock_${Math.random()}`, name: 'Y', type: 'data_number' }];
        outputs = [{ id: `sock_${Math.random()}`, name: 'Out', type: 'flow' }];
        break;
      case 'action_change_scene':
        label = 'Change Scene'; color = 'bg-indigo-900 border-indigo-700 text-indigo-100';
        inputs = [{ id: `sock_${Math.random()}`, name: 'In', type: 'flow' }];
        outputs = [];
        data = { sceneId: '' };
        break;

      // CONDITIONS
      case 'condition_branch':
        label = 'Branch (If)'; color = 'bg-amber-900 border-amber-700 text-amber-100';
        inputs = [{ id: `sock_${Math.random()}`, name: 'In', type: 'flow' }, { id: `sock_${Math.random()}`, name: 'Condition', type: 'data_boolean' }];
        outputs = [{ id: `sock_${Math.random()}`, name: 'True', type: 'flow' }, { id: `sock_${Math.random()}`, name: 'False', type: 'flow' }];
        break;
      case 'condition_compare':
        label = 'Compare'; color = 'bg-amber-900 border-amber-700 text-amber-100';
        inputs = [{ id: `sock_${Math.random()}`, name: 'A', type: 'data_number' }, { id: `sock_${Math.random()}`, name: 'B', type: 'data_number' }];
        outputs = [{ id: `sock_${Math.random()}`, name: 'A == B', type: 'data_boolean' }, { id: `sock_${Math.random()}`, name: 'A > B', type: 'data_boolean' }, { id: `sock_${Math.random()}`, name: 'A < B', type: 'data_boolean' }];
        break;

      // VARIABLES
      case 'data_variable_num':
        label = 'Number Value'; color = 'bg-rose-900 border-rose-700 text-rose-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Value', type: 'data_number' }];
        data = { value: 0 };
        break;
      case 'data_variable_str':
        label = 'String Value'; color = 'bg-rose-900 border-rose-700 text-rose-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Value', type: 'data_string' }];
        data = { value: 'text' };
        break;
      case 'data_variable_bool':
        label = 'Boolean Value'; color = 'bg-rose-900 border-rose-700 text-rose-100';
        outputs = [{ id: `sock_${Math.random()}`, name: 'Value', type: 'data_boolean' }];
        data = { value: true };
        break;
    }
    
    // Position node cleanly at current scaled view offset
    const newNode: GraphNode = {
      id: `node_${Math.random().toString(36).substring(2, 7)}`,
      category, type, label, color,
      x: Math.round((-pan.x + 120) / zoom), 
      y: Math.round((-pan.y + 120) / zoom),
      inputs, outputs, data
    };
    
    addNode(newNode);
    pushConsoleLog('info', 'EVENT_EDITOR', `Spawned ${label} Node in Event Blocks.`);
  };

  // Compute positions of sockets
  const getSocketCoords = (node: GraphNode, socketId: string, isOutput: boolean) => {
    const index = isOutput 
      ? node.outputs.findIndex(s => s.id === socketId) 
      : node.inputs.findIndex(s => s.id === socketId);
    
    const yOffset = 48 + index * 24 + 12; // Title bar + rows spacing + offset
    const xOffset = isOutput ? 192 : 0; 
    return { x: node.x + xOffset, y: node.y + yOffset };
  };

  return (
    <div className="flex flex-col h-full flex-1 bg-neutral-900 border border-neutral-800 font-sans text-neutral-300">
      
      {/* Header */}
      <div className="h-8 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-3 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center space-x-2">
          <Workflow className="w-4 h-4 text-cyan-500" />
          <span>Visual Event Logic Graph</span>
        </span>

        {/* Zoom controls & quick actions inside Header */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 border-r border-neutral-850 pr-2">
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-neutral-500 w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={() => removeNodes(selectedNodeIds)} 
            disabled={selectedNodeIds.length === 0} 
            className="p-1 rounded text-neutral-500 hover:bg-rose-950 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Delete Selected Logic Nodes"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbox sidebar */}
        <div className="w-56 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-3 border-b border-neutral-850">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Node Palette</span>
          </div>
          <div className="p-2 space-y-4 flex-1">
            
            {/* Events Group */}
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-600 mb-2 px-1 flex items-center space-x-1.5">
                <Zap className="w-3 h-3 text-emerald-450" />
                <span>Events</span>
              </div>
              <div className="space-y-1">
                <button onClick={() => spawnNode('event_start', 'Event')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-emerald-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">On Scene Start</button>
                <button onClick={() => spawnNode('event_update', 'Event')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-emerald-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">On Update</button>
                <button onClick={() => spawnNode('event_interaction', 'Event')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-emerald-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">On Interaction</button>
                <button onClick={() => spawnNode('event_collision', 'Event')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-emerald-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">On Collision</button>
              </div>
            </div>

            {/* Actions Group */}
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-600 mb-2 px-1 flex items-center space-x-1.5">
                <Play className="w-3 h-3 text-indigo-405" />
                <span>Actions</span>
              </div>
              <div className="space-y-1">
                <button onClick={() => spawnNode('action_play_audio', 'Action')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-indigo-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Play Audio</button>
                <button onClick={() => spawnNode('action_move', 'Action')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-indigo-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Move Entity</button>
                <button onClick={() => spawnNode('action_change_scene', 'Action')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-indigo-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Change Scene</button>
                <button onClick={() => spawnNode('action_log', 'Action')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-indigo-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Log Message</button>
              </div>
            </div>

            {/* Conditions Group */}
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-600 mb-2 px-1 flex items-center space-x-1.5">
                <Network className="w-3 h-3 text-amber-450" />
                <span>Logic</span>
              </div>
              <div className="space-y-1">
                <button onClick={() => spawnNode('condition_branch', 'Condition')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-amber-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Branch (If)</button>
                <button onClick={() => spawnNode('condition_compare', 'Condition')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-amber-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Compare</button>
              </div>
            </div>

            {/* Variables Group */}
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-600 mb-2 px-1 flex items-center space-x-1.5">
                <Database className="w-3 h-3 text-rose-450" />
                <span>Variables</span>
              </div>
              <div className="space-y-1">
                <button onClick={() => spawnNode('data_variable_num', 'Variable')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-rose-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Number</button>
                <button onClick={() => spawnNode('data_variable_str', 'Variable')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-rose-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">String</button>
                <button onClick={() => spawnNode('data_variable_bool', 'Variable')} className="w-full text-left px-3 py-1.5 bg-neutral-900 hover:bg-rose-900/30 border border-neutral-800 hover:border-neutral-750 rounded text-xs text-neutral-400 hover:text-neutral-200 transition-all">Boolean</button>
              </div>
            </div>

          </div>
        </div>

        {/* Node Graph Area */}
        <div 
           className="flex-1 bg-neutral-950 relative overflow-hidden cursor-grab active:cursor-grabbing"
           onPointerDown={handlePointerDownBackground}
           onPointerMove={handlePointerMovePath}
           onPointerUp={handlePointerUpPath}
           onPointerLeave={handlePointerUpPath}
        >
          {/* Grid background wrapping */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: 'repeating-linear-gradient(#fff 0 1px, transparent 1px 100%), repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 100%)',
            backgroundSize: '48px 48px',
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}></div>
          
          {/* Scalable Container Div */}
          <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {/* SVG Canvas for Lines */}
            <svg ref={svgRef} className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0 overflow-visible">
               {connections.map(conn => {
                  const fromNode = nodes.find(n => n.id === conn.fromNode);
                  const toNode = nodes.find(n => n.id === conn.toNode);
                  if (fromNode && toNode) {
                    const start = getSocketCoords(fromNode, conn.fromSocket, true);
                    const end = getSocketCoords(toNode, conn.toSocket, false);
                    
                    const cx1 = start.x + Math.max(Math.abs(end.x - start.x) / 2, 55);
                    const cx2 = end.x - Math.max(Math.abs(end.x - start.x) / 2, 55);

                    return (
                      <g key={conn.id}>
                        <path 
                          d={`M ${start.x} ${start.y} C ${cx1} ${start.y} ${cx2} ${end.y} ${end.x} ${end.y}`}
                          stroke="#6366f1" 
                          strokeWidth="3.2" 
                          fill="none" 
                          strokeLinecap="round"
                          className="opacity-80"
                        />
                      </g>
                    );
                  }
                  return null;
               })}

               {/* Active Drag Connection */}
               {connectingFrom && dragPointer && (
                 (() => {
                    const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
                    if (fromNode) {
                      const start = getSocketCoords(fromNode, connectingFrom.socketId, true);
                      const cx1 = start.x + Math.max(Math.abs(dragPointer.x - start.x) / 2, 55);
                      const cx2 = dragPointer.x - Math.max(Math.abs(dragPointer.x - start.x) / 2, 55);
                      return (
                         <path 
                           d={`M ${start.x} ${start.y} C ${cx1} ${start.y} ${cx2} ${dragPointer.y} ${dragPointer.x} ${dragPointer.y}`}
                           stroke="#a3a3a3" 
                           strokeWidth="3" 
                           fill="none" 
                           strokeLinecap="round"
                           className="opacity-70 animate-pulse pointer-events-none"
                         />
                      );
                    }
                    return null;
                 })()
               )}
            </svg>

            {/* Nodes Container */}
            <div className="absolute inset-0">
               {nodes.map(node => (
                 <div
                   key={node.id}
                   onPointerDown={(e) => handleNodePointerDown(node.id, e)}
                   className={`absolute w-48 border rounded-lg shadow-2xl flex flex-col cursor-move select-none transition-shadow ${node.color} ${
                     selectedNodeIds.includes(node.id) ? 'ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] z-25 opacity-100' : 'opacity-95 z-10'
                   }`}
                   style={{ left: node.x, top: node.y }}
                 >
                   <div className="px-3 py-1.5 border-b border-black/30 text-[9px] font-extrabold uppercase tracking-widest flex justify-between items-center rounded-t shadow-inner bg-black/10">
                     <span>{node.category}</span>
                     {node.category === 'Event' && <Zap className="w-3 h-3 text-emerald-400" />}
                     {node.category === 'Action' && <Play className="w-3 h-3 text-indigo-400" />}
                     {node.category === 'Condition' && <Network className="w-3 h-3 text-amber-400" />}
                     {node.category === 'Variable' && <Database className="w-3 h-3 text-rose-450" />}
                   </div>
                   <div className="bg-neutral-900/95 rounded-b p-2">
                     <div className="text-center font-bold text-xs mb-2.5 text-neutral-100 uppercase tracking-tight">{node.label}</div>
                     
                     <div className="flex justify-between mt-1 text-[10px] font-medium px-0.5">
                       {/* Input Sockets */}
                       <div className="flex flex-col space-y-2">
                         {node.inputs.map(input => (
                           <div key={input.id} className="flex items-center space-x-1.5 relative h-4">
                             <div 
                               onPointerUp={(e) => handleSocketPointerUp(node.id, input.id, false, e)}
                               className={`absolute -left-3.5 w-3.5 h-3.5 rounded-full border border-black cursor-crosshair z-30 transition-transform hover:scale-125 ${input.type === 'flow' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                             />
                             <span className="text-neutral-400 font-semibold">{input.name}</span>
                           </div>
                         ))}
                       </div>
                       
                       {/* Output Sockets */}
                       <div className="flex flex-col space-y-2 text-right">
                         {node.outputs.map(output => (
                           <div key={output.id} className="flex items-center justify-end space-x-1.5 relative h-4">
                             <span className="text-neutral-400 font-semibold">{output.name}</span>
                             <div 
                               onPointerDown={(e) => handleSocketPointerDown(node.id, output.id, true, e)}
                               className={`absolute -right-3.5 w-3.5 h-3.5 rounded-full border border-black cursor-crosshair z-30 transition-transform hover:scale-125 ${output.type === 'flow' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                             />
                           </div>
                         ))}
                       </div>
                     </div>

                     {/* Node Data Fields Editor */}
                     {Object.keys(node.data).length > 0 && (
                       <div className="mt-3 pt-2.5 border-t border-black/20 space-y-2 pb-0.5" onPointerDown={e => e.stopPropagation()}>
                         {Object.entries(node.data).map(([key, val]) => (
                           <div key={key} className="flex flex-col space-y-1">
                             <label className="text-[9px] font-bold text-neutral-500 uppercase leading-none">{key}</label>
                             {typeof val === 'boolean' ? (
                               <input 
                                 type="checkbox" 
                                 checked={val} 
                                 onChange={(e) => updateNodeData(node.id, { [key]: e.target.checked })} 
                                 className="accent-indigo-505 cursor-pointer w-3.5 h-3.5 block"
                               />
                             ) : (
                               <input 
                                 type={typeof val === 'number' ? 'number' : 'text'}
                                 value={val}
                                 onChange={(e) => updateNodeData(node.id, { [key]: typeof val === 'number' ? Number(e.target.value) : e.target.value })}
                                 className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 rounded px-1.5 py-1 text-[10px] outline-none focus:border-indigo-505/50 transition-colors pointer-events-auto cursor-text font-mono"
                               />
                             )}
                           </div>
                         ))}
                       </div>
                     )}

                   </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-neutral-950/80 border border-neutral-800 rounded px-3 py-2 text-[10px] font-mono text-neutral-500 z-30 flex flex-col items-end backdrop-blur-sm pointer-events-none">
            <span className="font-bold text-neutral-300">CONTROLS</span>
            <span>Drag empty background space to Pan canvas</span>
            <span>Shift + Drag / Click to select multiple logic nodes</span>
            <span>Drag output sockets to input sockets to bind events</span>
          </div>
        </div>
      </div>
    </div>
  );
}
