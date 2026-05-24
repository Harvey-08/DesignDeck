import React, { useState, useRef } from 'react';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, Copy, GripVertical,
  Square, Circle, Type, Pencil, Share2, Triangle, Image as ImageIcon,
  ChevronRight, ChevronDown, MoveUp, MoveDown
} from 'lucide-react';

const TYPE_COLORS = {
  rect: "#6366F1", circle: "#EC4899", text: "#F59E0B", image: "#10B981",
  pen: "#8B5CF6", stroke: "#8B5CF6", arrow: "#06B6D4", triangle: "#F97316"
};

const TYPE_ICONS = {
  rect: Square, circle: Circle, text: Type, image: ImageIcon,
  pen: Pencil, stroke: Pencil, arrow: Share2, triangle: Triangle
};

export const LayerRow = ({
  layer, isActive, depth = 0, onSelect, onUpdate, onDelete, onDuplicate,
  onDragStart, onDragOver, onDrop, onAction, isExpanded, onToggleExpand
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tempName, setEditName] = useState(layer.name || layer.type);

  const handleRename = () => {
    if (tempName.trim() !== "") onUpdate(layer.id, { name: tempName });
    setIsEditing(false);
  };

  const Icon = TYPE_ICONS[layer.type] || Square;

  return (
    <div className="relative mb-1 last:mb-0">
      <div
        draggable onDragStart={(e) => onDragStart(e, layer.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, layer.id)}
        onClick={() => layer.visible && onSelect(layer.id)}
        onDoubleClick={() => !layer.locked && setIsEditing(true)}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
        className={`group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border ${isActive
            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100'
            : 'bg-white/50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'
          } ${!layer.visible ? 'opacity-40' : ''}`}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <GripVertical size={12} className={isActive ? 'text-white/40' : 'text-slate-300 group-hover:text-slate-400'} />

        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-50 border border-slate-100'}`}>
          <Icon size={13} strokeWidth={2.5} style={{ color: isActive ? 'white' : TYPE_COLORS[layer.type] }} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus className="w-full bg-white text-slate-900 text-[11px] font-bold rounded-md px-1.5 py-0.5 outline-none"
              value={tempName} onChange={(e) => setEditName(e.target.value)} onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          ) : (
            <span className={`text-[11px] font-bold truncate block ${isActive ? 'text-white' : 'text-slate-700'}`}>
              {layer.name || layer.type}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onUpdate(layer.id, { locked: !layer.locked }); }} className={`p-1 rounded-md ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-100'}`}>
            {layer.locked ? <Lock size={12} /> : <Unlock size={12} className="opacity-40" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onUpdate(layer.id, { visible: !layer.visible }); }} className={`p-1 rounded-md ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-100'}`}>
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
      </div>

      {showMenu && (
        <div className="absolute left-full top-0 ml-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-[200]" onMouseLeave={() => setShowMenu(false)}>
          <MenuButton icon={MoveUp} label="To Front" onClick={() => { onAction('bringToFront', layer.id); setShowMenu(false); }} />
          <MenuButton icon={MoveDown} label="To Back" onClick={() => { onAction('sendToBack', layer.id); setShowMenu(false); }} />
          <div className="h-px bg-slate-50 my-1" />
          <MenuButton icon={Copy} label="Duplicate" onClick={() => { onDuplicate(layer.id); setShowMenu(false); }} />
          <MenuButton icon={Trash2} label="Delete" onClick={() => { onDelete(layer.id); setShowMenu(false); }} danger />
        </div>
      )}
    </div>
  );
};

const MenuButton = ({ icon: Icon, label, onClick, danger }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}>
    <Icon size={12} /> {label}
  </button>
);
