import React, { useState, useMemo } from 'react';
import { LayerRow } from './LayerRow.jsx';
import { Search, Layers, ChevronDown, Plus, LayoutGrid } from 'lucide-react';

export const LayersPanel = ({ layers, activeId, actions }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const toggleGroup = (id) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedGroups(next);
  };

  const rootLayers = useMemo(() => {
    return layers.filter(l => !l.parentId);
  }, [layers]);

  const filteredRoot = rootLayers.filter(l =>
    (l.name || l.type).toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = (type, id) => {
    if (!actions) return;
    switch (type) {
      case 'bringToFront': actions.bringToFront?.(id); break;
      case 'sendToBack': actions.sendToBack?.(id); break;
      default: break;
    }
  };

  const renderLayerTree = (layer, depth = 0) => {
    const isExpanded = expandedGroups.has(layer.id);
    const children = layers.filter(l => l.parentId === layer.id);

    return (
      <React.Fragment key={layer.id}>
        <LayerRow
          layer={layer}
          isActive={activeId === layer.id}
          depth={depth}
          onSelect={actions.setActiveLayerId}
          onUpdate={actions.updateLayer}
          onDelete={actions.deleteLayer}
          onDuplicate={actions.duplicateLayer}
          onAction={handleAction}
          onDragStart={(e, id) => { setDragId(id); e.dataTransfer.setData('text/plain', id); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e, targetId) => {
            e.preventDefault();
            if (dragId && dragId !== targetId) actions.reorderLayers(dragId, targetId);
            setDragId(null);
          }}
          isExpanded={isExpanded}
          onToggleExpand={toggleGroup}
        />
        {layer.type === 'group' && isExpanded && children.map(child => renderLayerTree(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm transition-transform hover:scale-105 active:scale-95">
            <Layers className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[15px] font-black uppercase tracking-[0.1em] text-slate-900 leading-none">Layers</span>
            <div className="bg-indigo-600/5 px-2 py-0.5 rounded-lg border border-indigo-100 mt-1">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">{layers.length} Elements</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:border-indigo-700 hover:text-white transition-all shadow-sm active:scale-90">
            <Plus size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-all ${isOpen ? 'rotate-180 bg-slate-50' : ''}`}
          >
            <ChevronDown size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-spring ${isOpen ? 'opacity-100' : 'opacity-0 h-0 pointer-events-none'}`}>
        {/* Modern Search Bar */}
        <div className="px-6 pb-4">
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              placeholder="Search elements..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable Layer List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar space-y-1">
          {filteredRoot.length > 0 ? (
            filteredRoot.map(layer => renderLayerTree(layer))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-20 gap-3 grayscale">
              <LayoutGrid size={40} strokeWidth={1.5} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Canvas Empty</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
