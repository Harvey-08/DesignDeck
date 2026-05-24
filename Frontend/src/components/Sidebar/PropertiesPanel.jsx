import React, { useState } from 'react';
import { Palette, Box, Type, Maximize2, MoveHorizontal, Zap, ChevronDown } from 'lucide-react';

const SAVED_COLORS = [
  'transparent', '#FFFFFF', '#A1A1AA', '#3F3F46', '#18181B',
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#F43F5E', '#D946EF'
];

const FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Cursive', value: 'cursive' }
];

const CollapsibleSubsection = ({ icon: Icon, title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Icon size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-slate-800 transition-colors">{title}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
        <div className="px-6">{children}</div>
      </div>
    </div>
  );
};

const PropertiesPanel = ({ 
  brushColor, strokeWidth, strokeOpacity, gridOpacity, fontFamily, 
  onFontFamilyChange, onBrushColorChange, onStrokeWidthChange, 
  onStrokeOpacityChange, onGridOpacityChange, fillEnabled, onFillToggle, 
  element, onUpdate 
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col">
      {/* Header Section */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm transition-transform hover:scale-105 active:scale-95">
            <Palette className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[15px] font-black uppercase tracking-[0.1em] text-slate-900 leading-tight">Properties</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Box size={10} strokeWidth={3} className="text-indigo-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Live Inspector</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onFillToggle(); }}
            className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shadow-sm active:scale-90 ${fillEnabled ? 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-200' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}
          >
            <Box size={18} strokeWidth={2.5} />
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
      <div className={`transition-all duration-500 ease-spring overflow-hidden ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="custom-scrollbar overflow-y-auto max-h-[500px] py-2">
          
          {/* Color Palette */}
          <CollapsibleSubsection icon={Palette} title="Color Palette" defaultOpen={true}>
            <div className="grid grid-cols-7 gap-2">
              {SAVED_COLORS.map((color, idx) => (
                <button 
                  key={idx}
                  onClick={() => onBrushColorChange?.(color)}
                  className={`relative w-full aspect-square rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 shadow-sm ${
                    (brushColor || '').toLowerCase() === color.toLowerCase() 
                      ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' 
                      : 'border border-slate-100 hover:border-slate-300'
                  }`}
                  style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                >
                  {color === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-red-500 text-[10px] font-bold">/</div>}
                  {(brushColor || '').toLowerCase() === color.toLowerCase() && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          </CollapsibleSubsection>

          {/* Typography */}
          <CollapsibleSubsection icon={Type} title="Typography">
            <div className="relative group">
              <select 
                value={fontFamily}
                onChange={(e) => onFontFamilyChange?.(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 appearance-none cursor-pointer shadow-sm hover:border-slate-200 transition-all"
              >
                {FONTS.map(font => <option key={font.value} value={font.value}>{font.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500" />
            </div>
          </CollapsibleSubsection>

          {/* Size & Weight */}
          <CollapsibleSubsection icon={Maximize2} title="Size & Weight">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative flex items-center h-6">
                <div className="absolute w-full h-1 bg-slate-100 rounded-full" />
                <input
                  type="range" min="1" max="100" value={strokeWidth || 5}
                  onChange={(e) => onStrokeWidthChange?.(Number(e.target.value))}
                  className="absolute w-full accent-indigo-600 appearance-none bg-transparent cursor-pointer z-10"
                />
              </div>
              <div className="shrink-0 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100 shadow-sm min-w-[48px] text-center">
                <span className="text-[10px] font-black font-mono text-indigo-600 leading-none">{strokeWidth || 5}px</span>
              </div>
            </div>
          </CollapsibleSubsection>

          {/* Opacity */}
          <CollapsibleSubsection icon={Zap} title="Layer Opacity">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative flex items-center h-6">
                <div className="absolute w-full h-1 bg-slate-100 rounded-full" />
                <input
                  type="range" min="0" max="100" value={strokeOpacity || 100}
                  onChange={(e) => onStrokeOpacityChange?.(Number(e.target.value))}
                  className="absolute w-full accent-indigo-600 appearance-none bg-transparent cursor-pointer z-10"
                />
              </div>
              <div className="shrink-0 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100 shadow-sm min-w-[48px] text-center">
                <span className="text-[10px] font-black font-mono text-indigo-600 leading-none">{strokeOpacity || 100}%</span>
              </div>
            </div>
          </CollapsibleSubsection>

          {/* Grid Visibility */}
          <CollapsibleSubsection icon={MoveHorizontal} title="Grid Intensity">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative flex items-center h-6">
                <div className="absolute w-full h-1 bg-slate-100 rounded-full" />
                <input
                  type="range" min="0" max="100" value={gridOpacity || 30}
                  onChange={(e) => onGridOpacityChange?.(Number(e.target.value))}
                  className="absolute w-full accent-indigo-600 appearance-none bg-transparent cursor-pointer z-10"
                />
              </div>
              <div className="shrink-0 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100 shadow-sm min-w-[48px] text-center">
                <span className="text-[10px] font-black font-mono text-indigo-600 leading-none">{gridOpacity || 30}%</span>
              </div>
            </div>
          </CollapsibleSubsection>

        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
