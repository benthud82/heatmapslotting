'use client';

import React from 'react';
import { ElementType } from '@/lib/types';

interface SidebarProps {
    activeTool: 'select' | ElementType;
    onSelectTool: (tool: 'select' | ElementType) => void;
}

export default function Sidebar({ activeTool, onSelectTool }: SidebarProps) {
    const tools = [
        { id: 'select', icon: 'M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z', label: 'Select (V)', type: 'select' },
        { id: 'bay', icon: 'M1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm12 11V2H2v11h11z', label: 'Draw Bay', type: 'bay' },
        { id: 'flow_rack', icon: 'M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM3 3h10v1H3V3zm0 2h10v1H3V5zm0 2h10v1H3V7zm0 2h10v1H3V9zm0 2h10v1H3v-1z', label: 'Draw Flow Rack', type: 'flow_rack' },
        { id: 'full_pallet', icon: 'M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM5 5h6v6H5V5z', label: 'Draw Pallet', type: 'full_pallet' },
        { id: 'text', icon: 'M3 4h10v2H3V4zm0 3h6v2H3V7zm0 3h10v2H3v-2z', label: 'Add Text', type: 'text' },
        { id: 'line', icon: 'M3 13h10v-2H3v2z', label: 'Draw Line', type: 'line' },
        { id: 'arrow', icon: 'M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z', label: 'Draw Arrow', type: 'arrow' },
    ];

    return (
        <aside className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-30">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.type as any)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${activeTool === tool.type
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    title={tool.label}
                >
                    {/* Simple SVG Icons (Replace with proper icons later if needed) */}
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                        {/* Use a generic path if specific paths are too complex for inline string, but here we try to map them */}
                        {tool.id === 'select' && <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103zM2.25 8.184l3.897 1.67a.5.5 0 0 1 .262.263l1.67 3.897L12.743 3.52z" />}
                        {tool.id === 'bay' && <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm14 12V2H2v12h12z" />}
                        {tool.id === 'flow_rack' && <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM3 3h10v1H3V3zm0 2h10v1H3V5zm0 2h10v1H3V7zm0 2h10v1H3V9zm0 2h10v1H3v-1z" />}
                        {tool.id === 'full_pallet' && <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM5 5h6v6H5V5z" />}
                        {tool.id === 'text' && <path d="M12.258 3h-8.51l-.083 2.46h.479c.26-1.544.758-1.783 2.693-1.845l.424-.013v7.827c0 .663-.144.82-1.3.923v.52h4.082v-.52c-1.162-.103-1.306-.26-1.306-.923V3.602l.431.013c1.934.062 2.434.301 2.693 1.846h.479L12.258 3z" />}
                        {tool.id === 'line' && <path d="M3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8z" />}
                        {tool.id === 'arrow' && <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />}
                    </svg>

                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-700 shadow-xl">
                        {tool.label}
                    </div>
                </button>
            ))}
        </aside>
    );
}
