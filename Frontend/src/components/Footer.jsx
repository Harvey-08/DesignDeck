import { Palette, Maximize2, MoveHorizontal, Zap, Box, MousePointer, Type } from 'lucide-react';

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

export default function Footer({ brushColor, strokeWidth, strokeOpacity, gridOpacity, fontFamily, onFontFamilyChange, onBrushColorChange, onStrokeWidthChange, onStrokeOpacityChange, onGridOpacityChange, fillEnabled, onFillToggle, activeTool, eraserStrength, onEraserStrengthChange }) {
  return (
    <div className="w-[300px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center border border-purple-200">
            <Palette className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-[0.25em] text-slate-900">Properties</span>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={onFillToggle}
            className={`w-10 h-10 icon-button border transition-all ${fillEnabled ? 'bg-purple-100 border-purple-300 text-purple-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
            title="Toggle Shape Fill"
           >
             <Box className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
        {/* Eraser Specific Property */}
        {activeTool === 'eraser' && (
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Eraser Strength</span>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded shadow-sm">{eraserStrength}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={eraserStrength}
              onChange={(e) => onEraserStrengthChange?.(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-indigo-400">
              <span>Partial</span>
              <span>Full Object</span>
            </div>
          </div>
        )}

        {/* Colors */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Color Palette</span>
            <div className="w-5 h-5 rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: brushColor === 'transparent' ? 'white' : brushColor, backgroundImage: brushColor === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)' : 'none', backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px' }} />
          </div>
          <div className="grid grid-cols-7 gap-3">
            {SAVED_COLORS.map((color, idx) => (
              <button 
                key={idx}
                onClick={() => onBrushColorChange?.(color)}
                className={`w-full aspect-square rounded-full transition-all duration-200 hover:scale-110 active:scale-90 ${
                  brushColor.toLowerCase() === color.toLowerCase() 
                    ? 'ring-2 ring-purple-600 ring-offset-2 ring-offset-white scale-110' 
                    : 'border border-slate-200 hover:border-slate-400'
                }`}
                style={{ 
                    backgroundColor: color === 'transparent' ? 'white' : color,
                    backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee)' : 'none',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 4px 4px',
                    position: 'relative'
                }}
              >
                {color === 'transparent' && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-[10px]">/</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Typography</span>
            </div>
            <select 
                value={fontFamily}
                onChange={(e) => onFontFamilyChange?.(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 transition-all appearance-none cursor-pointer"
            >
                {FONTS.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                ))}
            </select>
        </div>

        {/* Sliders */}
        <div className="space-y-6 pt-2">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Size / Weight</span>
              <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{strokeWidth}px</span>
            </div>
            <input
              type="range" min="1" max="100" value={strokeWidth}
              onChange={(e) => onStrokeWidthChange?.(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Opacity</span>
              <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{strokeOpacity}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={strokeOpacity}
              onChange={(e) => onStrokeOpacityChange?.(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Grid Visibility</span>
              <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{gridOpacity}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={gridOpacity}
              onChange={(e) => onGridOpacityChange?.(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Visual Reference Area at Bottom */}
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col items-center gap-4">
         <div 
                className="rounded-full shadow-lg transition-all duration-300"
                style={{ 
                    width: `${Math.min(strokeWidth, 60)}px`, 
                    height: `${Math.min(strokeWidth, 60)}px`, 
                    backgroundColor: brushColor === 'transparent' ? 'transparent' : brushColor,
                    border: brushColor === 'transparent' ? '2px dashed #ccc' : 'none',
                    opacity: strokeOpacity / 100
                }} 
            />
         <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Brush & Text Preview</span>
      </div>
    </div>
  );
}
