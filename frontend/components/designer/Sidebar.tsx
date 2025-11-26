'use client';

import React from 'react';
import { ElementType, RouteMarkerType } from '@/lib/types';

interface SidebarProps {
    activeTool: 'select' | ElementType | RouteMarkerType;
    onSelectTool: (tool: 'select' | ElementType | RouteMarkerType) => void;
}

export default function Sidebar({ activeTool, onSelectTool }: SidebarProps) {
    const elementTools = [
        { id: 'select', label: 'Select (V)', type: 'select' as const },
        { id: 'bay', label: 'Draw Bay', type: 'bay' as const },
        { id: 'flow_rack', label: 'Draw Flow Rack', type: 'flow_rack' as const },
        { id: 'full_pallet', label: 'Draw Pallet', type: 'full_pallet' as const },
        { id: 'text', label: 'Add Text', type: 'text' as const },
        { id: 'line', label: 'Draw Line', type: 'line' as const },
        { id: 'arrow', label: 'Draw Arrow', type: 'arrow' as const },
    ];

    const routeMarkerTools = [
        { id: 'start_point', label: 'Start Point', type: 'start_point' as RouteMarkerType, color: '#10b981' },
        { id: 'stop_point', label: 'Stop Point', type: 'stop_point' as RouteMarkerType, color: '#ef4444' },
        { id: 'cart_parking', label: 'Cart Parking', type: 'cart_parking' as RouteMarkerType, color: '#3b82f6' },
    ];

    const renderIcon = (id: string) => {
        switch (id) {
            case 'select':
                return <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103zM2.25 8.184l3.897 1.67a.5.5 0 0 1 .262.263l1.67 3.897L12.743 3.52z" />;
            case 'bay':
                return <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm14 12V2H2v12h12z" />;
            case 'flow_rack':
                return <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM3 3h10v1H3V3zm0 2h10v1H3V5zm0 2h10v1H3V7zm0 2h10v1H3V9zm0 2h10v1H3v-1z" />;
            case 'full_pallet':
                return <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM5 5h6v6H5V5z" />;
            case 'text':
                return <path d="M12.258 3h-8.51l-.083 2.46h.479c.26-1.544.758-1.783 2.693-1.845l.424-.013v7.827c0 .663-.144.82-1.3.923v.52h4.082v-.52c-1.162-.103-1.306-.26-1.306-.923V3.602l.431.013c1.934.062 2.434.301 2.693 1.846h.479L12.258 3z" />;
            case 'line':
                return <path d="M3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8z" />;
            case 'arrow':
                return <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />;
            case 'start_point':
                return <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM6 4l6 4-6 4V4z" />;
            case 'stop_point':
                return <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM5 5h6v6H5V5z" />;
            case 'cart_parking':
                return <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />;
            default:
                return null;
        }
    };

    return (
        <aside className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-1 z-30 overflow-y-auto">
            {/* Element Tools */}
            <div className="flex flex-col items-center gap-1">
                {elementTools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.type)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${
                            activeTool === tool.type
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={tool.label}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                            {renderIcon(tool.id)}
                        </svg>

                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-700 shadow-xl">
                            {tool.label}
                        </div>
                    </button>
                ))}
            </div>

            {/* Divider */}
            <div className="w-8 h-px bg-slate-700 my-2" />

            {/* Route Markers Section */}
            <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">Route</span>
                {routeMarkerTools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.type)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${
                            activeTool === tool.type
                                ? 'text-white shadow-lg'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                        style={activeTool === tool.type ? { backgroundColor: tool.color, boxShadow: `0 4px 14px -3px ${tool.color}80` } : {}}
                        title={tool.label}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                            {renderIcon(tool.id)}
                        </svg>

                        {/* Colored indicator dot when not active */}
                        {activeTool !== tool.type && (
                            <div 
                                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                style={{ backgroundColor: tool.color }}
                            />
                        )}

                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-700 shadow-xl">
                            {tool.label}
                        </div>
                    </button>
                ))}
            </div>
        </aside>
    );
}
