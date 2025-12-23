'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CongestionZone, getGradientColor } from '@/lib/dashboardUtils';

interface CongestionMapProps {
  zones: CongestionZone[];
  loading?: boolean;
  onZoneClick?: (zone: CongestionZone) => void;
}

interface TooltipData {
  zone: CongestionZone;
  x: number;
  y: number;
}

export default function CongestionMap({ zones, loading, onZoneClick }: CongestionMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });

  // Calculate canvas dimensions to maintain aspect ratio
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Maintain 3:2 aspect ratio
        const width = Math.min(containerWidth, 400);
        const height = (width * 2) / 3;
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw the heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || zones.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find grid dimensions from zones
    const maxRow = Math.max(...zones.map(z => z.row)) + 1;
    const maxCol = Math.max(...zones.map(z => z.col)) + 1;

    const cellWidth = canvas.width / maxCol;
    const cellHeight = canvas.height / maxRow;

    // Draw each zone
    zones.forEach(zone => {
      const x = zone.col * cellWidth;
      const y = zone.row * cellHeight;

      // Get color based on density
      if (zone.density > 0) {
        const color = getGradientColor(zone.density, 0, 1);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3 + zone.density * 0.7; // Min 30% opacity
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.globalAlpha = 0.5;
      }

      ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
      ctx.globalAlpha = 1;
    });

    // Draw grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= maxCol; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= maxRow; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(canvas.width, i * cellHeight);
      ctx.stroke();
    }
  }, [zones, canvasSize]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || zones.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find grid dimensions
    const maxRow = Math.max(...zones.map(z => z.row)) + 1;
    const maxCol = Math.max(...zones.map(z => z.col)) + 1;

    const cellWidth = canvas.width / maxCol;
    const cellHeight = canvas.height / maxRow;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    const zone = zones.find(z => z.row === row && z.col === col);
    if (zone && zone.pickCount > 0) {
      setTooltip({ zone, x: e.clientX, y: e.clientY });
    } else {
      setTooltip(null);
    }
  }, [zones]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onZoneClick) return;

    const canvas = canvasRef.current;
    if (!canvas || zones.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const maxRow = Math.max(...zones.map(z => z.row)) + 1;
    const maxCol = Math.max(...zones.map(z => z.col)) + 1;

    const cellWidth = canvas.width / maxCol;
    const cellHeight = canvas.height / maxRow;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    const zone = zones.find(z => z.row === row && z.col === col);
    if (zone && zone.pickCount > 0) {
      onZoneClick(zone);
    }
  }, [zones, onZoneClick]);

  // Count hotspots
  const hotspotCount = zones.filter(z => z.density >= 0.7).length;

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-40 mb-4"></div>
          <div className="h-48 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Congestion Map</h3>
            <p className="text-sm text-slate-500">Spatial Density</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-slate-500 text-sm">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl shadow-xl relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Congestion Map</h3>
            <p className="text-sm text-slate-500">Spatial Density</p>
          </div>
        </div>

        {/* Hotspot indicator */}
        {hotspotCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-medium">{hotspotCount} Hotspot{hotspotCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="rounded-xl cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Gradient legend */}
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-slate-500">Low</span>
          <div className="flex-1 mx-2 h-2 rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 opacity-80" />
          <span className="text-xs text-slate-500">High</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <p className="text-sm font-medium text-white">
            Zone ({tooltip.zone.row + 1}, {tooltip.zone.col + 1})
          </p>
          <p className="text-xs text-slate-400 mt-1">
            <span className="text-cyan-400 font-mono">{tooltip.zone.pickCount.toLocaleString()}</span> picks
          </p>
          {tooltip.zone.elements.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              {tooltip.zone.elements.length} location{tooltip.zone.elements.length > 1 ? 's' : ''}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getGradientColor(tooltip.zone.density, 0, 1) }}
            />
            <span className="text-xs text-slate-500">
              {Math.round(tooltip.zone.density * 100)}% intensity
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
