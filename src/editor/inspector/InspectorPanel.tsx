import { useState } from 'react';
import { 
  SlidersHorizontal, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Search, 
  Copy, 
  Check, 
  Tag, 
  Layers, 
  Hash, 
  Move, 
  Zap, 
  Image, 
  Shield, 
  Film, 
  Camera, 
  Gamepad2, 
  Grid, 
  Network, 
  Settings,
  X,
  Sparkles
} from 'lucide-react';
import { useEditorStore } from '../../state/editor.store';
import { useEngineStore } from '../../state/engine.store';
import { ComponentRegistry } from '../../core/ecs/ComponentRegistry';
import { ModifyComponentCommand } from '../../core/command-system/commands/ModifyComponentCommand';
import { AnimationInspector } from './AnimationInspector';
import { NumberField, SliderField, AssetField } from './InspectorFields';
import { TransformInspector } from './TransformInspector';

export function InspectorPanel() {
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);
  const forceUpdate = useEditorStore((s) => s.forceUpdate);
  useEditorStore((s) => s.editorUpdateToken); // Re-render when forced
  const entityNames = useEditorStore((s) => s.entityNames);
  const setEntityName = useEditorStore((s) => s.setEntityName);
  const engine = useEngineStore((s) => s.engine);

  const [showAddComponent, setShowAddComponent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [componentFilter, setComponentFilter] = useState('');
  const [collapsedComponents, setCollapsedComponents] = useState<Record<string, boolean>>({});

  if (selectedEntityId === null || !engine) {
    return (
      <div className="flex flex-col h-full bg-neutral-950">
        <div className="h-10 border-b border-neutral-800 flex items-center px-3 flex-shrink-0 bg-neutral-900/40">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-550 mr-2" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Inspector</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-6 text-center opacity-50 space-y-3">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-850">
            <SlidersHorizontal className="w-6 h-6 text-neutral-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-300">No Target Specified</h3>
            <p className="text-xs text-neutral-500 max-w-[200px]">Select an active game entity from the Hierarchy list to customize properties.</p>
          </div>
        </div>
      </div>
    );
  }

  const components = engine.world.getComponentsForEntity(selectedEntityId);
  const allSchemas = ComponentRegistry.getAllSchemas();

  const updateComponentValue = (comp: string, key: string, value: any) => {
    if (components[comp]) {
      const command = new ModifyComponentCommand(engine, selectedEntityId, comp, { [key]: value });
      engine.commands.executeCommand(command);
      forceUpdate(); // trigger re-render
    }
  };

  const removeComponent = (comp: string) => {
    engine.world.removeComponent(selectedEntityId, comp);
    forceUpdate();
  };

  const addComponent = (comp: string) => {
    if (components[comp]) return;
    const initialData = ComponentRegistry.create(comp);
    engine.world.addComponent(selectedEntityId, comp, initialData);
    setShowAddComponent(false);
    forceUpdate();
  };

  const resetComponent = (comp: string) => {
    const defaults = ComponentRegistry.create(comp);
    const command = new ModifyComponentCommand(engine, selectedEntityId, comp, defaults);
    engine.commands.executeCommand(command);
    forceUpdate();
  };

  const toggleCollapse = (comp: string) => {
    setCollapsedComponents(prev => ({
      ...prev,
      [comp]: !prev[comp]
    }));
  };

  // Synchronized tag and layer mutations updating metadata component underneath
  const setMetadataValue = (key: 'tag' | 'layer' | 'name', val: any) => {
    if (!components['metadata']) {
      // Lazy-provision metadata in underlying world state
      const initialData = ComponentRegistry.create('metadata');
      engine.world.addComponent(selectedEntityId, 'metadata', {
        ...initialData,
        name: entityNames[selectedEntityId] || `Entity ${selectedEntityId}`
      });
    }
    updateComponentValue('metadata', key, val);
  };

  const handleCopySnapshot = () => {
    const schemaDump = {
      entityId: selectedEntityId,
      name: entityNames[selectedEntityId] || `Entity ${selectedEntityId}`,
      componentsCount: Object.keys(components).length,
      snapshot: components
    };
    navigator.clipboard.writeText(JSON.stringify(schemaDump, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getComponentIcon = (name: string) => {
    switch (name) {
      case 'transform': return <Move className="w-3.5 h-3.5 text-indigo-400" />;
      case 'velocity': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'sprite': return <Image className="w-3.5 h-3.5 text-emerald-400" />;
      case 'collider': return <Shield className="w-3.5 h-3.5 text-rose-450" />;
      case 'animator': return <Film className="w-3.5 h-3.5 text-sky-400" />;
      case 'camera': return <Camera className="w-3.5 h-3.5 text-purple-400" />;
      case 'playerController': return <Gamepad2 className="w-3.5 h-3.5 text-fuchsia-400" />;
      case 'tilemap': return <Grid className="w-3.5 h-3.5 text-teal-400" />;
      case 'hierarchy': return <Network className="w-3.5 h-3.5 text-orange-450" />;
      case 'parallaxLayer': return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case 'metadata': return <Tag className="w-3.5 h-3.5 text-lime-400" />;
      default: return <Settings className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const currentName = entityNames[selectedEntityId] || `Entity ${selectedEntityId}`;
  const metadataComponent = components['metadata'] || {};
  const currentTag = metadataComponent.tag || 'Untagged';
  const currentLayer = metadataComponent.layer !== undefined ? metadataComponent.layer : 0;

  const renderField = (compName: string, field: any, value: any) => {
    if (field.type === 'number') {
      return (
        <NumberField 
          key={field.name}
          label={field.label} 
          value={value} 
          onChange={v => updateComponentValue(compName, field.name, v)} 
        />
      );
    }
    if (field.type === 'string') {
      return (
        <div key={field.name} className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-1 px-2.5 focus-within:border-indigo-500/50 transition-colors">
          <span className="text-[10px] uppercase font-bold text-neutral-500 w-16 shrink-0 truncate mr-1">{field.label}</span>
          <input 
            type="text"
            placeholder="empty"
            value={value || ""}
            onChange={(e) => updateComponentValue(compName, field.name, e.target.value)}
            className="w-full bg-transparent text-right text-xs font-mono text-neutral-100 outline-none" 
          />
        </div>
      );
    }
    if (field.type === 'color') {
      return (
        <div key={field.name} className="flex items-center justify-between text-xs text-neutral-400 p-1 px-2.5 rounded-lg border border-neutral-800 bg-neutral-900">
          <span className="text-[10px] uppercase font-bold text-neutral-500">{field.label}</span>
          <div className="flex items-center space-x-2">
            <input 
              type="color" 
              value={value || "#ffffff"}
              onChange={e => updateComponentValue(compName, field.name, e.target.value)}
              className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
            />
            <span className="font-mono text-xs text-neutral-200">{value || '#ffffff'}</span>
          </div>
        </div>
      );
    }
    if (field.type === 'boolean') {
      return (
        <div key={field.name} className="flex justify-between items-center bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 px-2.5">
          <span className="text-[10px] uppercase font-bold text-neutral-500">{field.label}</span>
          <input 
            type="checkbox" 
            checked={!!value}
            onChange={e => updateComponentValue(compName, field.name, e.target.checked)}
            className="rounded border-neutral-800 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
          />
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <div key={field.name} className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-1 px-2.5 focus-within:border-indigo-500/50 transition-colors">
          <span className="text-[10px] uppercase font-bold text-neutral-500 w-12 shrink-0">{field.label}</span>
          <select 
            value={value || ""}
            onChange={(e) => updateComponentValue(compName, field.name, e.target.value)}
            className="w-full bg-transparent text-right text-xs text-neutral-200 outline-none cursor-pointer font-medium"
          >
            {field.options?.map((opt: string) => (
               <option key={opt} value={opt} className="bg-neutral-950 text-neutral-200">{opt}</option>
            ))}
          </select>
        </div>
      );
    }
    if (field.type === 'slider') {
      return (
        <SliderField 
          key={field.name}
          label={field.label} 
          value={value} 
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          onChange={v => updateComponentValue(compName, field.name, v)} 
        />
      );
    }
    if (field.type === 'asset') {
      return (
        <AssetField
          key={field.name}
          label={field.label}
          value={value}
          assetType={field.assetType}
          onChange={v => updateComponentValue(compName, field.name, v)}
        />
      );
    }
    return null;
  };

  // Sieve components list based on interactive filtering input
  const allAttachedComponents = Object.entries(components);
  const filteredComponents = allAttachedComponents.filter(([compName]) => {
    if (!componentFilter) return true;
    return compName.toLowerCase().includes(componentFilter.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-200 overflow-hidden">
      
      {/* Top Titlebar */}
      <div className="h-10 border-b border-neutral-800 flex items-center justify-between px-3 bg-neutral-900/40 flex-shrink-0">
        <div className="flex items-center space-x-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Inspector</span>
        </div>
        <button
          onClick={handleCopySnapshot}
          className="flex items-center space-x-1.5 px-2 py-1 bg-neutral-900 hover:bg-neutral-850 text-[10px] font-medium text-neutral-400 hover:text-white rounded border border-neutral-800 transition-colors"
          title="Copy Entity components snapshot as JSON"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy JSON'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-3.5 custom-scrollbar pb-16">

        {/* Dynamic Interactive Entity Core Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-4">
          
          <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-[11px] font-mono text-neutral-400 font-semibold select-all">Entity #{selectedEntityId}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{allAttachedComponents.length} Components</span>
            </span>
          </div>

          <div className="space-y-3">
            {/* 1. Name Identifier */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-neutral-500 tracking-wider">Entity Name</label>
              <input 
                type="text" 
                value={currentName}
                onChange={(e) => {
                  setEntityName(selectedEntityId, e.target.value);
                  setMetadataValue('name', e.target.value);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 font-sans outline-none focus:ring-1 focus:ring-indigo-500/20"
                placeholder="Identify game object..."
              />
            </div>

            {/* 2. Layer and Tag Split columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Tag className="w-2.5 h-2.5 text-lime-400" />
                  <span>Category Tag</span>
                </label>
                <select 
                  value={currentTag}
                  onChange={(e) => {
                    setMetadataValue('tag', e.target.value);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500/80"
                >
                  <option value="Untagged">Untagged</option>
                  <option value="Player">Player</option>
                  <option value="Enemy">Enemy</option>
                  <option value="NPC">NPC</option>
                  <option value="Solid">Solid</option>
                  <option value="Collectible">Collectible</option>
                  <option value="Trigger">Trigger</option>
                  <option value="UIPanel">UI Panel</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black text-neutral-500 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-2.5 h-2.5 text-cyan-400" />
                  <span>Render Layer</span>
                </label>
                <select 
                  value={currentLayer}
                  onChange={(e) => {
                    setMetadataValue('layer', parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500/80"
                >
                  <option value={0}>0 - Default</option>
                  <option value={1}>1 - Background</option>
                  <option value={2}>2 - Midground</option>
                  <option value={3}>3 - Foreground</option>
                  <option value={4}>4 - UI overlays</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Inline Component filter search */}
        {allAttachedComponents.length > 2 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-550 pointer-events-none" />
            <input 
              type="text"
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              placeholder="Search components here..."
              className="w-full bg-neutral-900/60 border border-neutral-850 text-xs text-neutral-200 placeholder-neutral-550 rounded-lg pl-8 pr-7 py-1.5 outline-none focus:border-indigo-500/40"
            />
            {componentFilter && (
              <button 
                onClick={() => setComponentFilter('')}
                className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-350 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Collapsible Components List container */}
        <div className="space-y-3.5">
          {filteredComponents.map(([compName, compData]) => {
            const schema = ComponentRegistry.getSchema(compName);
            if (!schema) return null;

            const isCollapsed = collapsedComponents[compName] || false;

            return (
              <div key={compName} className="bg-neutral-900 border border-neutral-850 hover:border-neutral-800 transition-all rounded-xl overflow-hidden shadow-sm">
                
                {/* Collapsible Component Row Header */}
                <div 
                  onClick={() => toggleCollapse(compName)}
                  className="flex items-center justify-between p-3 py-2.5 bg-neutral-900/80 hover:bg-neutral-850/40 cursor-pointer select-none border-b border-neutral-850/60 select-none group/row"
                >
                  <div className="flex items-center space-x-2 overflow-hidden mr-2">
                    <div className="text-neutral-500 group-hover/row:text-neutral-300 transition-colors">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    <div className="p-1 rounded bg-neutral-950 border border-neutral-850">
                      {getComponentIcon(compName)}
                    </div>
                    <span className="text-xs font-bold text-neutral-200 capitalize truncate tracking-wider">{schema.name}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => resetComponent(compName)}
                      className="p-1 text-neutral-500 hover:text-indigo-400 hover:bg-neutral-800 rounded transition-colors"
                      title={`Reset component initial settings for ${compName}`}
                    >
                      <RefreshCw className="w-3 h-3 animate-reverse-spin" />
                    </button>
                    {compName !== 'transform' && compName !== 'metadata' && (
                      <button 
                        onClick={() => removeComponent(compName)}
                        className="p-1 text-neutral-550 hover:text-rose-450 hover:bg-neutral-800 rounded transition-colors"
                        title={`Remove ${schema.name} component`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Component Fields Editor Panel Body */}
                {!isCollapsed && (
                  <div className="p-3 bg-neutral-950/45 border-t border-neutral-950/80">
                    {compName === 'animator' ? (
                      <AnimationInspector />
                    ) : compName === 'transform' ? (
                      <TransformInspector 
                        compData={compData} 
                        updateValue={(key, val) => updateComponentValue(compName, key, val)} 
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {schema.fields.map(field => {
                          const rendered = renderField(compName, field, compData[field.name]);
                          const isFullWidth = ['string', 'color', 'boolean', 'select', 'slider', 'asset'].includes(field.type);
                          return (
                            <div key={field.name} className={isFullWidth ? "col-span-2" : "col-span-1"}>
                               {rendered}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredComponents.length === 0 && (
            <div className="p-6 border border-dashed border-neutral-850 rounded-xl text-center text-xs text-neutral-500">
              {allAttachedComponents.length === 0 ? "No components currently attached to this entity." : "No components matched search filter."}
            </div>
          )}
        </div>

        {/* Dynamic "Add Component" interactive toolkit panel */}
        <div className="mt-4">
          {showAddComponent ? (
            <div className="bg-neutral-900 border border-neutral-805 rounded-xl p-3 space-y-2">
              <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center justify-between border-b border-neutral-850 pb-2 mb-1">
                <span>Add Engine Component</span>
                <button onClick={() => setShowAddComponent(false)} className="text-neutral-500 hover:text-neutral-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                {allSchemas.filter(s => !components[s.name]).map(schema => (
                  <button 
                    key={schema.name} 
                    onClick={() => addComponent(schema.name)} 
                    className="flex items-center space-x-1.5 px-2 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-950 hover:bg-indigo-600 rounded-lg border border-neutral-800 transition-colors text-left font-medium select-none cursor-pointer"
                  >
                    <div className="p-0.5 bg-neutral-900 rounded shrink-0">
                      {getComponentIcon(schema.name)}
                    </div>
                    <span className="capitalize truncate leading-tight">{schema.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowAddComponent(true)}
              disabled={allSchemas.filter(s => !components[s.name]).length === 0}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 disabled:opacity-40 disabled:pointer-events-none text-neutral-350 hover:text-white rounded-xl border border-neutral-800 hover:border-neutral-700 text-xs font-semibold tracking-wider transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>ADD COMPONENT</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
