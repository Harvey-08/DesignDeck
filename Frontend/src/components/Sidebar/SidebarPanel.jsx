import React from 'react';
import { LayersPanel } from './LayersPanel.jsx';
import PropertiesPanel from './PropertiesPanel.jsx';
import { useTheme } from '../../context/ThemeContext';

export default function SidebarPanel({ engine, layers, activeLayerId, actions, propertiesProps }) {
  const { t } = useTheme();

  return (
    <aside className="w-full h-full flex flex-col pointer-events-auto bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden relative">
      {/* Soft Radial Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(#6366f1 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
        {/* Layer Section */}
        <section className="flex-1 min-h-[250px] flex flex-col overflow-hidden">
          <LayersPanel
            layers={layers}
            activeId={activeLayerId}
            actions={actions}
          />
        </section>

        {/* Properties Section */}
        <section className="shrink-0 flex flex-col bg-slate-50/30">
          <PropertiesPanel
            {...propertiesProps}
            element={layers.find(l => l.id === activeLayerId)}
            onUpdate={actions.updateLayer}
          />
        </section>
      </div>
    </aside>
  );
}
