import { Layers, Box, Plus, Trash2, ChevronRight, ChevronDown, Package, Search, Pencil } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEngineStore } from '../../state/engine.store';
import { useEditorStore } from '../../state/editor.store';
import { createTransform } from '../../core/ecs/components/Transform';
import { createSprite } from '../../core/ecs/components/Sprite';
import { CreateEntityCommand } from '../../core/command-system/commands/CreateEntityCommand';
import { DeleteEntityCommand } from '../../core/command-system/commands/DeleteEntityCommand';
import { ReparentEntityCommand } from '../../core/command-system/commands/ReparentEntityCommand';
import { Hierarchy, createHierarchy } from '../../core/ecs/components/Hierarchy';

export function HierarchyPanel() {
  const engine = useEngineStore((s) => s.engine);
  useEditorStore((s) => s.editorUpdateToken); 
  
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const setSelectedEntity = useEditorStore((s) => s.setSelectedEntity);
  const forceUpdate = useEditorStore((s) => s.forceUpdate);
  const entityNames = useEditorStore((s) => s.entityNames);
  const setEntityName = useEditorStore((s) => s.setEntityName);
  
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [showPrefabMenu, setShowPrefabMenu] = useState(false);
  const prefabMenuRef = useRef<HTMLDivElement>(null);

  // New states for Polish Phase
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingEntityId, setRenamingEntityId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOverEntityId, setDragOverEntityId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (prefabMenuRef.current && !prefabMenuRef.current.contains(event.target as Node)) {
        setShowPrefabMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startRenaming = useCallback((id: number) => {
    setRenamingEntityId(id);
    setRenameValue(entityNames[id] || `Entity ${id}`);
  }, [entityNames, setRenameValue, setRenamingEntityId]);

  // F2 keyboard shortcut to trigger renaming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && selectedEntityId !== null) {
        startRenaming(selectedEntityId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityId, startRenaming]);

  const saveRename = (id: number) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      setEntityName(id, trimmed);
    }
    setRenamingEntityId(null);
    forceUpdate();
  };

  const prefabs = engine?.prefabs.getAllPrefabs() || [];
  const entities = engine ? engine.world.getAllEntities() : new Set<number>();

  const handleAddEntity = () => {
    if (!engine) return;
    const command = new CreateEntityCommand(engine, {
      transform: createTransform(0, 0),
      sprite: createSprite(32, 24, '#3b82f6'),
      hierarchy: createHierarchy(selectedEntityId)
    });
    engine.commands.executeCommand(command);
    
    const currentEntities = engine.world.getAllEntities();
    if (currentEntities.size > 0) {
      const newEntity = Math.max(...currentEntities);
      if (selectedEntityId !== null) {
          const reparent = new ReparentEntityCommand(engine, newEntity, selectedEntityId);
          engine.commands.executeCommand(reparent);
          setExpandedNodes((prev) => new Set(prev).add(selectedEntityId));
      }
      setSelectedEntity(newEntity);
    }
    forceUpdate();
  };

  const handleAddPrefab = (prefabId: string) => {
    if (!engine) return;
    const newEntity = engine.prefabs.instantiate(prefabId);
    if (newEntity !== null) {
      if (selectedEntityId !== null) {
         const reparent = new ReparentEntityCommand(engine, newEntity, selectedEntityId);
         engine.commands.executeCommand(reparent);
         setExpandedNodes((prev) => new Set(prev).add(selectedEntityId));
      }
      setSelectedEntity(newEntity);
    }
    setShowPrefabMenu(false);
    forceUpdate();
  };

  const handleDeleteEntity = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!engine) return;
    const command = new DeleteEntityCommand(engine, id);
    engine.commands.executeCommand(command);
    if (selectedEntityId === id) {
      setSelectedEntity(null);
    }
    forceUpdate();
  };

  const toggleExpand = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    e.stopPropagation();
  };

  const onDragOver = (e: React.DragEvent, targetId: number | null) => {
    e.preventDefault();
    if (targetId !== dragOverEntityId) {
      setDragOverEntityId(targetId);
    }
  };

  const onDrop = (e: React.DragEvent, targetId: number | null) => {
    e.preventDefault();
    setDragOverEntityId(null);
    if (!engine) return;
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    if (!draggedIdStr) return;
    const draggedId = parseInt(draggedIdStr, 10);
    
    // Prevent dragging into self or child
    let current = targetId;
    while (current !== null) {
      if (current === draggedId) return; // Cycle!
      const h = engine.world.getComponent(current, 'hierarchy') as Hierarchy;
      current = h ? h.parent : null;
    }

    if (draggedId !== targetId) {
      const command = new ReparentEntityCommand(engine, draggedId, targetId);
      engine.commands.executeCommand(command);
      if (targetId !== null) {
          setExpandedNodes((prev) => new Set(prev).add(targetId));
      }
      forceUpdate();
    }
    e.stopPropagation();
  };

  // Find root entities
  const rootEntities = Array.from(entities).filter(e => {
    const h = engine?.world.getComponent(e, 'hierarchy') as Hierarchy;
    return !h || h.parent === null;
  });

  const matchesSearch = (id: number) => {
    if (!searchQuery) return true;
    const name = entityNames[id] || `Entity ${id}`;
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || id.toString() === searchQuery;
  };

  const renderEntity = (entity: number, depth: number = 0) => {
    if (!engine) return null;
    const isSelected = selectedEntityId === entity;
    const hierarchy = engine.world.getComponent(entity, 'hierarchy') as Hierarchy;
    const hasChildren = hierarchy && hierarchy.children && hierarchy.children.length > 0;
    const isExpanded = expandedNodes.has(entity);
    const isRenaming = renamingEntityId === entity;
    const name = entityNames[entity] || `Entity ${entity}`;
    const isDragOver = dragOverEntityId === entity;

    // Skip rendering if search is active and this node + none of its children match
    if (searchQuery && !matchesSearch(entity)) {
      // Check if any child matches search recursively
      const checkChildrenMatch = (e: number): boolean => {
        const h = engine.world.getComponent(e, 'hierarchy') as Hierarchy;
        if (matchesSearch(e)) return true;
        if (h && h.children) {
          return h.children.some(checkChildrenMatch);
        }
        return false;
      };
      if (!checkChildrenMatch(entity)) return null;
    }

    return (
      <div key={entity}>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, entity)}
          onDragOver={(e) => onDragOver(e, entity)}
          onDrop={(e) => onDrop(e, entity)}
          onClick={() => setSelectedEntity(entity)}
          onDoubleClick={() => startRenaming(entity)}
          className={`w-full flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs text-left transition-colors group ${
            isDragOver 
              ? 'border border-indigo-500 bg-neutral-800'
              : isSelected 
                ? 'bg-indigo-600 text-white font-medium' 
                : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-neutral-100'
          }`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          <div className="flex items-center space-x-1.5 overflow-hidden w-full mr-2">
            <div 
              className={`w-4 h-4 flex items-center justify-center rounded-sm hover:bg-neutral-700 transition-colors ${hasChildren ? 'cursor-pointer text-current opacity-70 hover:opacity-100' : 'opacity-0'}`} 
              onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(e, entity); }}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
            <Box className={`w-3.5 h-3.5 opacity-80 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
            
            {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => saveRename(entity)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(entity);
                  if (e.key === 'Escape') setRenamingEntityId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-indigo-500"
              />
            ) : (
              <span className="truncate font-medium">{name}</span>
            )}
          </div>
          <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); startRenaming(entity); }}
              className="p-1 hover:bg-neutral-800 text-neutral-550 hover:text-neutral-300 rounded transition-colors"
              title="Rename Entity (F2)"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDeleteEntity(e, entity)}
              className="p-1 hover:bg-rose-500/15 text-neutral-550 hover:text-rose-400 rounded transition-colors"
              title="Delete Entity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="mt-0.5 space-y-0.5">
            {hierarchy.children.map(child => renderEntity(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" onDragOver={(e) => onDragOver(e, null)} onDrop={(e) => onDrop(e, null)}>
      <div className="h-10 border-b border-neutral-800 flex items-center justify-between px-3 bg-neutral-900/40 flex-shrink-0 relative">
        <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Hierarchy</span>
        <div className="flex space-x-2 relative" ref={prefabMenuRef}>
           <button 
             onClick={() => setShowPrefabMenu(!showPrefabMenu)}
             className="text-neutral-400 hover:text-indigo-400 p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
             title="Add Prefab Instance"
           >
             <Package className="w-4 h-4" />
           </button>
           <button 
             onClick={handleAddEntity}
             className="text-neutral-400 hover:text-neutral-200 p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
             title="Add Empty Entity"
           >
             <Plus className="w-4 h-4" />
           </button>
           
           {showPrefabMenu && (
             <div className="absolute right-0 top-7 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl w-48 z-55 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-neutral-800 bg-neutral-800/50">
                  <span className="text-[9px] uppercase font-bold text-neutral-500">Instantiate Prefab</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {prefabs.length === 0 ? (
                    <div className="text-center p-3 text-neutral-500 text-xs">No prefabs loaded.</div>
                  ) : (
                    prefabs.map((p: any) => (
                      <button 
                        key={p.id}
                        onClick={() => handleAddPrefab(p.id)}
                        className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors flex items-center space-x-2 cursor-pointer"
                      >
                         <Package className="w-3.5 h-3.5 opacity-70 text-indigo-400" />
                         <span className="truncate">{p.name || p.id}</span>
                      </button>
                    ))
                  )}
                </div>
             </div>
           )}
         </div>
      </div>

      {/* Dynamic Search Bar */}
      <div className="px-2 py-1.5 border-b border-neutral-800 bg-neutral-900/40">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-neutral-550 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search entities (F2 / Click)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-neutral-200 placeholder-neutral-550 focus:outline-none focus:border-indigo-500/80 transition-shadow focus:ring-1 focus:ring-indigo-500/20 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-neutral-500 hover:text-neutral-350 text-xs px-1 hover:bg-neutral-800 rounded font-bold cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar pt-2 pb-10">
        {!engine || entities.size === 0 ? (
          <div className="text-neutral-500 text-sm flex items-center justify-center h-20 opacity-50 space-x-2">
            <Layers className="w-4 h-4" />
            <span>Empty Scene</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {rootEntities.map((entity: number) => renderEntity(entity, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
