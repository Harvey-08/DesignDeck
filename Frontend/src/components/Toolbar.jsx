import { useState } from 'react'
import {
  Pencil, MousePointer2, Eraser, Square, Circle, Type, PaintBucket, Move, PenTool, Triangle, Hexagon,
  Undo2, Redo2, Trash2, Download, Brush, Tag, EyeOff
} from 'lucide-react'

const toolGroups = [
  {
    id: 'selection',
    name: 'Selection Tools',
    color: '#6B7A99',
    popup: true,
    groupIcon: MousePointer2,
    tools: [
      { id: 'select', icon: MousePointer2, name: 'Selection Tool' }
    ]
  },
  {
    id: 'drawing',
    name: 'Drawing Tools',
    color: '#7C6AF2',
    popup: true,
    groupIcon: Brush,
    tools: [
      { id: 'draw', icon: PenTool, name: 'Brush Tool' },
      { id: 'pencil', icon: Pencil, name: 'Pencil Tool' }
    ]
  },
  {
    id: 'shapes',
    name: 'Shape Tools',
    color: '#444A5A',
    popup: true,
    groupIcon: Hexagon,
    tools: [
      { id: 'rectangle', icon: Square, name: 'Rectangle Tool' },
      { id: 'circle', icon: Circle, name: 'Circle Tool' },
      { id: 'triangle', icon: Triangle, name: 'Triangle Tool' },
      { id: 'polygon', icon: Hexagon, name: 'Polygon Tool' }
    ]
  },
  {
    id: 'utility',
    name: 'Utility Tools',
    color: '#444A5A',
    popup: false,
    tools: [
      { id: 'fill', icon: PaintBucket, name: 'Fill Tool' },
      { id: 'text', icon: Type, name: 'Text Tool' }
    ]
  },
  {
    id: 'destructive',
    name: 'Editing Tools',
    color: '#F26D6D',
    popup: false,
    tools: [
      { id: 'eraser', icon: Eraser, name: 'Eraser Tool' },
      { id: 'clear', icon: Trash2, name: 'Clear Canvas' }
    ]
  },
  {
    id: 'history',
    name: 'History Tools',
    color: '#444A5A',
    popup: false,
    tools: [
      { id: 'tag', icon: Tag, name: 'Tag Current State' },
      { id: 'undo', icon: Undo2, name: 'Undo Action' },
      { id: 'redo', icon: Redo2, name: 'Redo Action' },
      { id: 'toggle-focus', icon: EyeOff, name: 'Focus Mode' }
    ]
  }
]

export default function Toolbar({ activeTool, onToolChange, onAction, onPreviewAction, userRole }) {
  const [openPopup, setOpenPopup] = useState(null)
  const [hoveredTool, setHoveredTool] = useState(null)

  const togglePopup = (id) => {
    setOpenPopup(prev => (prev === id ? null : id))
  }

  const handleToolClick = (tool) => {
    const isAction = ['undo', 'redo', 'clear', 'export', 'tag', 'toggle-focus'].includes(tool.id)
    if (isAction) onAction?.(tool.id)
    else onToolChange(tool.id)
  }

  const getVisibleGroups = () => {
    if (userRole !== 'viewer') return toolGroups;

    // For viewers, only show Focus Mode
    // Let's create a safe list.
    return toolGroups.map(group => {
      if (group.id === 'history') {
        return {
          ...group,
          tools: group.tools.filter(t => t.id === 'toggle-focus')
        };
      }
      return null;
    }).filter(Boolean).filter(g => g.tools.length > 0);
  };

  const visibleGroups = getVisibleGroups();

  if (userRole === 'viewer' && visibleGroups.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-[3rem] w-16 p-4 py-6 flex flex-col items-center gap-2 border border-slate-200 shadow-2xl relative z-[100]">
        <div className="text-[10px] font-black uppercase text-slate-400 rotate-180" style={{ writingMode: 'vertical-rl' }}>
          View Only
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-[3rem]
                    w-16 p-3 py-8
                    flex flex-col items-center gap-0
                    border border-slate-200 shadow-2xl
                    relative z-[100]">

      {visibleGroups.map((group, i) => {
        const isOpen = openPopup === group.id

        return (
          <div key={group.id} className="relative flex flex-col items-center w-full">
            {i > 0 && <div className="w-12 h-[1px] bg-slate-100 my-2" />}

            {/* POPUP TOGGLE */}
            {group.popup && (
              <div className="relative group/tooltip">
                <button
                  onClick={() => togglePopup(group.id)}
                  onMouseEnter={() => setHoveredTool(group.name)}
                  onMouseLeave={() => setHoveredTool(null)}
                  className={`w-12 h-12 border rounded-2xl
                    flex items-center justify-center
                    transition-all active:scale-90
                    ${isOpen
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-transparent'
                    }`}
                >
                  <group.groupIcon className="w-6 h-6" />
                </button>

                {/* Custom Tooltip */}
                {!isOpen && hoveredTool === group.name && (
                  <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg whitespace-nowrap shadow-xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                    {group.name}
                  </div>
                )}
              </div>
            )}

            {/* SIDE POPUP */}
            {group.popup && isOpen && (
              <div
                className="absolute left-16 top-0
                           bg-white rounded-3xl p-2
                           flex flex-col gap-0
                           shadow-2xl border border-slate-200 z-50 ml-2 animate-in slide-in-from-left-2 duration-300"
              >
                {group.tools.map((tool) => {
                  const Icon = tool.icon
                  const isActive = activeTool === tool.id

                  return (
                    <div key={tool.id} className="relative group/subtooltip">
                      <button
                        onClick={() => handleToolClick(tool)}
                        onMouseEnter={() => setHoveredTool(tool.name)}
                        onMouseLeave={() => setHoveredTool(null)}
                        className={`w-14 h-14 rounded-2xl
                          flex items-center justify-center
                          transition-all active:scale-90
                          ${isActive
                            ? 'text-white'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        style={isActive ? { backgroundColor: group.color } : {}}
                      >
                        <Icon className="w-6 h-6" />
                      </button>

                      {hoveredTool === tool.name && (
                        <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg whitespace-nowrap shadow-xl z-[60]">
                          {tool.name}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* NON-POPUP TOOLS */}
            {!group.popup && (
              <div className="flex flex-col gap-0">
                {group.tools.map((tool) => {
                  const Icon = tool.icon
                  const isActive = activeTool === tool.id

                  return (
                    <div key={tool.id} className="relative group/tooltip">
                      <button
                        onClick={() => handleToolClick(tool)}
                        onMouseEnter={() => {
                          setHoveredTool(tool.name);
                          if (tool.id === 'undo' || tool.id === 'redo') onPreviewAction?.(tool.id, true);
                        }}
                        onMouseLeave={() => {
                          setHoveredTool(null);
                          if (tool.id === 'undo' || tool.id === 'redo') onPreviewAction?.(tool.id, false);
                        }}
                        className={`w-12 h-12 rounded-2xl
                                   flex items-center justify-center
                                   transition-all active:scale-90
                                   ${isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Icon className="w-6 h-6" />
                      </button>

                      {hoveredTool === tool.name && (
                        <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg whitespace-nowrap shadow-xl pointer-events-none">
                          {tool.name}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
