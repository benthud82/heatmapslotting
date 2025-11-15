# Warehouse Slotting Visualization MVP - Technical Implementation Guide

## Project Overview
Deliver a web-based warehouse heatmap tool that lets operations teams draw their layout, ingest large pick datasets (historical sales or average demand), and visualize pick intensity by bay/upright without replacing their WMS. Target: 3-month development timeline for the heatmap-focused MVP.

## Technology Stack

### Backend
- **Framework**: Node.js with Express.js (or Python FastAPI as alternative)
- **Database**: PostgreSQL with PostGIS extension for spatial queries and JSON handling
- **File Processing**: Multer for uploads with stream-based parsers (e.g., fast-csv) to handle 100k+ row files without blocking
- **Background Jobs**: BullMQ (Redis) or Node worker threads for asynchronous ingestion & aggregation
- **Authentication**: JWT tokens with bcrypt for password hashing
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI Library**: Tailwind CSS + shadcn/ui components
- **Layout Editor**: react-konva (canvas-based) or SVG tooling for drag-and-drop warehouse drawing
- **Visualization**: D3.js for heatmaps with canvas rendering for large datasets
- **State Management**: Zustand or Redux Toolkit
- **File Upload**: react-dropzone

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (backend) for quick deployment
- **File Storage**: AWS S3 or Cloudinary for raw CSV storage plus ingestion checkpoints
- **Database**: Supabase or Neon for managed PostgreSQL
- **Monitoring**: Sentry for error tracking and ingestion pipeline alerts

## Database Schema

```sql
-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMP
);

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    total_locations INTEGER,
    square_footage INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Persisted layout drawings authored in the UI
CREATE TABLE warehouse_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    canvas_width INTEGER NOT NULL,
    canvas_height INTEGER NOT NULL,
    grid_size INTEGER DEFAULT 12,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual layout elements (aisles, uprights, bays, staging zones)
CREATE TABLE layout_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES warehouse_layouts(id) ON DELETE CASCADE,
    element_type VARCHAR(30) NOT NULL, -- 'aisle','upright','bay','zone'
    label VARCHAR(100),
    geometry geometry(POLYGON, 0), -- stores drawn shape in layout coordinates
    properties JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(layout_id, label)
);

-- Optional SKU master for attaching demand files
CREATE TABLE skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    sku_code VARCHAR(100) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20),
    UNIQUE(warehouse_id, sku_code)
);

-- Uploaded pick datasets (historical or average demand)
CREATE TABLE pick_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL, -- 'historical' | 'average_demand'
    original_filename VARCHAR(255),
    storage_key VARCHAR(255) NOT NULL,
    rows_ingested BIGINT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'uploaded', -- 'uploaded','processing','processed','failed'
    processing_errors JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Aggregated pick counts per layout element & optional SKU
CREATE TABLE element_pick_intensity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES pick_datasets(id) ON DELETE CASCADE,
    element_id UUID REFERENCES layout_elements(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES skus(id),
    pick_date DATE,
    pick_count NUMERIC(18,4) DEFAULT 0,
    units_picked NUMERIC(18,4),
    demand_type VARCHAR(20) DEFAULT 'actual', -- 'actual' | 'average'
    UNIQUE(dataset_id, element_id, sku_id, pick_date)
);

-- Rollups for fast heatmap rendering
CREATE MATERIALIZED VIEW element_pick_rollups AS
SELECT
    dataset_id,
    element_id,
    COALESCE(SUM(pick_count), 0) AS total_picks,
    MAX(pick_date) AS last_activity
FROM element_pick_intensity
GROUP BY dataset_id, element_id;

-- Post-MVP tables retained for future phases (ABC analysis, travel, slotting recommendations)
-- Current slotting assignments, pick history by discrete location, optimization results, etc.
-- These definitions remain as references and will be activated during the next phase.

-- Performance indexes
CREATE INDEX idx_layout_elements_type ON layout_elements(layout_id, element_type);
CREATE INDEX idx_pick_datasets_status ON pick_datasets(warehouse_id, status);
CREATE INDEX idx_element_pick_intensity_dataset ON element_pick_intensity(dataset_id, element_id);
CREATE INDEX idx_element_pick_intensity_date ON element_pick_intensity(pick_date);
```

## API Endpoints

### Authentication Endpoints
```typescript
// POST /api/auth/register
interface RegisterRequest {
  email: string;
  password: string;
  companyName: string;
}

// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

// Response
interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    subscriptionTier: string;
  };
}
```

### Warehouse Management
```typescript
// POST /api/warehouses
interface CreateWarehouseRequest {
  name: string;
  squareFootage?: number;
}

// GET /api/warehouses
// Returns array of user's warehouses

// GET /api/warehouses/:id
// Returns specific warehouse with summary stats
```

### Dataset Upload & Processing Endpoints
```typescript
// POST /api/layouts/:layoutId/datasets
interface DatasetUploadRequest {
  datasetType: 'historical' | 'average_demand';
  hasHeaderRow: boolean;
  columnMapping?: {
    location?: string;        // e.g. 'Bin', 'Upright'
    sku?: string;             // required when datasetType === 'average_demand'
    pickCount?: string;       // required for historical
    unitsPicked?: string;
    pickDate?: string;        // optional, defaults to aggregated range
  };
  timeGrouping?: 'daily' | 'weekly' | 'monthly';
}

interface DatasetUploadResponse {
  datasetId: string;
  layoutId: string;
  rowsQueued: number;
  status: 'uploaded' | 'processing';
}

// GET /api/datasets/:id/status
interface DatasetStatusResponse {
  id: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  rowsIngested: number;
  lastProcessedAt?: string;
  errors?: { line: number; message: string }[];
}

// POST /api/datasets/:id/reprocess
// Retry ingestion with updated column mapping or layout link
```

### Heatmap Endpoints
```typescript
// GET /api/layouts/:layoutId/heatmap?datasetId=uuid&aggregation=total
interface HeatmapResponse {
  layoutId: string;
  datasetId: string;
  scale: {
    minValue: number;
    maxValue: number;
    maxLabel: string;
  };
  elements: {
    elementId: string;
    label: string;
    polygon: [number, number][];
    pickCount: number;
    lastActivity?: string;
  }[];
}

// POST /api/layouts/:layoutId/heatmap/precompute
// Kicks off rollup refresh for heavy datasets (uses background job)
```

## Core Feature Implementation

The MVP front-to-back flow:
1. User sketches aisles/uprights/bays in the layout editor and saves the layout.
2. User uploads a pick dataset (historical or average demand) and maps CSV columns to layout labels.
3. Backend streams the file, aggregates picks per layout element, and materializes rollups.
4. Heatmap view requests rollups for the selected dataset and renders color-coded polygons over the saved layout.

### 1. Pick Dataset Ingestion Service
```javascript
// /backend/services/pickDatasetIngestor.js
const fs = require('fs');
const { parse } = require('@fast-csv/parse');
const { pipeline } = require('stream/promises');
const { queueBackgroundJob } = require('../jobs/queue');

class PickDatasetIngestor {
  constructor({ layoutRepository, skuRepository, elementRepository, intensityRepository }) {
    this.layoutRepository = layoutRepository;
    this.skuRepository = skuRepository;
    this.elementRepository = elementRepository;
    this.intensityRepository = intensityRepository;
  }

  async ingest({ datasetId, filePath, columnMapping, datasetType }) {
    const ingestionStream = fs.createReadStream(filePath);
    const parser = parse({ headers: true, ignoreEmpty: true, trim: true });

    let rowsQueued = 0;

    parser.on('data', async (row) => {
      parser.pause();

      try {
        const elementLabel = row[columnMapping.location];
        const element = await this.elementRepository.findByLabel(elementLabel);
        if (!element) {
          throw new Error(`Unknown layout element: ${elementLabel}`);
        }

        let skuId = null;
        if (datasetType === 'average_demand') {
          const skuCode = row[columnMapping.sku];
          skuId = await this.skuRepository.upsertByCode(skuCode);
        }

        await this.intensityRepository.enqueueObservation({
          datasetId,
          elementId: element.id,
          skuId,
          pickCount: this.parseNumber(row[columnMapping.pickCount]),
          unitsPicked: this.parseNumber(row[columnMapping.unitsPicked]),
          pickDate: this.parseDate(row[columnMapping.pickDate]),
          demandType: datasetType === 'average_demand' ? 'average' : 'actual'
        });

        rowsQueued += 1;
      } catch (error) {
        await this.intensityRepository.logError(datasetId, rowsQueued + 1, error.message);
      } finally {
        parser.resume();
      }
    });

    await pipeline(ingestionStream, parser);

    await queueBackgroundJob('process-pick-observations', { datasetId });

    return { datasetId, rowsQueued };
  }

  parseNumber(value) {
    if (!value) return 0;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

module.exports = PickDatasetIngestor;
```

### 2. Layout Builder Canvas
```typescript
// /frontend/components/LayoutEditorCanvas.tsx
import React, { useState } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { nanoid } from 'nanoid';

type Tool = 'select' | 'upright' | 'bay' | 'zone';

interface LayoutElement {
  id: string;
  type: Tool;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface LayoutEditorCanvasProps {
  elements: LayoutElement[];
  selectedTool: Tool;
  onChange(elements: LayoutElement[]): void;
  onSelectElement(id: string | null): void;
}

export const LayoutEditorCanvas: React.FC<LayoutEditorCanvasProps> = ({
  elements,
  selectedTool,
  onChange,
  onSelectElement,
}) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const handleStageMouseDown = (evt: any) => {
    const stage = evt.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    if (selectedTool === 'select') {
      onSelectElement(null);
      return;
    }

    setDragStart(pointerPosition);

    const newElement: LayoutElement = {
      id: nanoid(),
      type: selectedTool,
      label: `${selectedTool}-${elements.length + 1}`,
      x: pointerPosition.x,
      y: pointerPosition.y,
      width: 0,
      height: 0,
      rotation: 0,
    };

    onChange([...elements, newElement]);
  };

  const handleStageMouseMove = (evt: any) => {
    if (!dragStart) return;
    const stage = evt.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    onChange(
      elements.map((el, idx) =>
        idx === elements.length - 1
          ? {
              ...el,
              width: pointerPosition.x - dragStart.x,
              height: pointerPosition.y - dragStart.y,
            }
          : el,
      ),
    );
  };

  const handleStageMouseUp = () => {
    setDragStart(null);
  };

  const handleElementClick = (evt: any, elementId: string) => {
    evt.cancelBubble = true;
    onSelectElement(elementId);
  };

  return (
    <Stage
      width={1200}
      height={800}
      className="border border-gray-200 rounded-lg bg-gray-50"
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
    >
      <Layer>
        {elements.map((element) => (
          <React.Fragment key={element.id}>
            <Rect
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              rotation={element.rotation}
              fill={element.type === 'upright' ? '#fbbf24' : '#60a5fa'}
              opacity={0.6}
              stroke="#1f2937"
              strokeWidth={2}
              onClick={(evt) => handleElementClick(evt, element.id)}
            />
            <Text
              x={element.x + 8}
              y={element.y + 8}
              text={element.label}
              fontSize={14}
              fill="#111827"
            />
          </React.Fragment>
        ))}
      </Layer>
    </Stage>
  );
};
```

### 3. Heatmap Visualization Component
```typescript
// /frontend/components/WarehouseHeatmap.tsx
import React from 'react';
import { Stage, Layer, Shape, Text } from 'react-konva';
import { scaleSequential } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';

interface HeatmapElement {
  elementId: string;
  label: string;
  polygon: [number, number][];
  pickCount: number;
  lastActivity?: string;
}

interface HeatmapData {
  layoutId: string;
  datasetId: string;
  scale: {
    minValue: number;
    maxValue: number;
    maxLabel: string;
  };
  elements: HeatmapElement[];
}

export const WarehouseHeatmap: React.FC<{ data: HeatmapData }> = ({ data }) => {
  const colorScale = scaleSequential(interpolateYlOrRd).domain([
    data.scale.minValue,
    data.scale.maxValue || 1,
  ]);

  return (
    <div className="relative">
      <Stage width={1200} height={800} className="border border-slate-200 rounded-lg">
        <Layer>
          {data.elements.map((element) => (
            <React.Fragment key={element.elementId}>
              <Shape
                sceneFunc={(context, shape) => {
                  const [firstPoint, ...rest] = element.polygon;
                  context.beginPath();
                  context.moveTo(firstPoint[0], firstPoint[1]);
                  rest.forEach(([x, y]) => context.lineTo(x, y));
                  context.closePath();
                  context.fillStrokeShape(shape);
                }}
                fill={colorScale(element.pickCount)}
                stroke="#1f2937"
                strokeWidth={1}
                opacity={0.9}
              />
              <Text
                x={element.polygon[0][0] + 6}
                y={element.polygon[0][1] + 6}
                text={`${element.label}\n${Math.round(element.pickCount)} picks`}
                fontSize={12}
                fill="#111827"
              />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>

      <div className="absolute top-4 right-4 bg-white shadow rounded-md p-4 text-sm">
        <h4 className="font-semibold mb-2">Legend</h4>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-20 bg-gradient-to-r from-yellow-200 via-orange-400 to-red-600 rounded" />
          <span>{data.scale.maxLabel}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Showing dataset {data.datasetId} · last updated{' '}
          {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};
```

### 4. Dataset Upload Panel
```typescript
// /frontend/components/DatasetUploadPanel.tsx
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDataset } from '../lib/api';

interface DatasetUploadPanelProps {
  layoutId: string;
  onUploadComplete(datasetId: string): void;
}

export const DatasetUploadPanel: React.FC<DatasetUploadPanelProps> = ({
  layoutId,
  onUploadComplete,
}) => {
  const [datasetType, setDatasetType] = useState<'historical' | 'average_demand'>('historical');
  const [mapping, setMapping] = useState({
    location: '',
    sku: '',
    pickCount: '',
    unitsPicked: '',
    pickDate: '',
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'payload',
      JSON.stringify({
        datasetType,
        columnMapping: mapping,
        hasHeaderRow: true,
      }),
    );

    setStatusMessage('Uploading...');
    const response = await uploadDataset(layoutId, formData);
    setStatusMessage(`Queued ${response.rowsQueued.toLocaleString()} rows`);
    onUploadComplete(response.datasetId);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Dataset Type</label>
        <select
          value={datasetType}
          onChange={(event) => setDatasetType(event.target.value as typeof datasetType)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        >
          <option value="historical">Historical picks by location</option>
          <option value="average_demand">Average demand by SKU</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Location column"
          value={mapping.location}
          onChange={(event) => setMapping({ ...mapping, location: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="text"
          placeholder="Pick count column"
          value={mapping.pickCount}
          onChange={(event) => setMapping({ ...mapping, pickCount: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="text"
          placeholder="Units picked column"
          value={mapping.unitsPicked}
          onChange={(event) => setMapping({ ...mapping, unitsPicked: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="text"
          placeholder="Pick date column"
          value={mapping.pickDate}
          onChange={(event) => setMapping({ ...mapping, pickDate: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2"
        />
        {datasetType === 'average_demand' && (
          <input
            type="text"
            placeholder="SKU column"
            value={mapping.sku}
            onChange={(event) => setMapping({ ...mapping, sku: event.target.value })}
            className="rounded border border-slate-300 px-3 py-2 col-span-2"
          />
        )}
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg px-6 py-8 text-center transition ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-slate-600">
          Drag and drop CSV here, or click to select. Supports files with 100k+ rows.
        </p>
      </div>

      {statusMessage && <p className="text-xs text-slate-500">{statusMessage}</p>}
    </div>
  );
};
```

## Deferred Components (Post-MVP)

> The following components remain in the spec as references for future phases and are **not** part of the heatmap MVP deliverable.

### ABC Analysis Dashboard (Post-MVP)
```typescript
// /frontend/components/ABCAnalysis.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ABCData {
  aItems: { sku: string; picks: number; percentage: number; }[];
  bItems: { sku: string; picks: number; percentage: number; }[];
  cItems: { sku: string; picks: number; percentage: number; }[];
  summary: {
    aPercentage: number;
    bPercentage: number;
    cPercentage: number;
    aSkuCount: number;
    bSkuCount: number;
    cSkuCount: number;
  };
}

export const ABCAnalysisDashboard: React.FC<{ data: ABCData }> = ({ data }) => {
  const COLORS = {
    A: '#10b981', // Green
    B: '#f59e0b', // Yellow
    C: '#ef4444', // Red
  };

  const pieData = [
    { name: 'A Items', value: data.summary.aPercentage, count: data.summary.aSkuCount },
    { name: 'B Items', value: data.summary.bPercentage, count: data.summary.bSkuCount },
    { name: 'C Items', value: data.summary.cPercentage, count: data.summary.cSkuCount },
  ];

  // Prepare bar chart data (top 20 items)
  const barData = [
    ...data.aItems.slice(0, 10).map(item => ({ ...item, category: 'A' })),
    ...data.bItems.slice(0, 5).map(item => ({ ...item, category: 'B' })),
    ...data.cItems.slice(0, 5).map(item => ({ ...item, category: 'C' })),
  ].sort((a, b) => b.picks - a.picks);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Summary Cards */}
      <div className="col-span-full grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800">A Items</h3>
          <p className="text-2xl font-bold text-green-600">{data.summary.aSkuCount} SKUs</p>
          <p className="text-sm text-green-600">{data.summary.aPercentage.toFixed(1)}% of picks</p>
          <p className="text-xs text-gray-600 mt-2">Move to golden zone</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800">B Items</h3>
          <p className="text-2xl font-bold text-yellow-600">{data.summary.bSkuCount} SKUs</p>
          <p className="text-sm text-yellow-600">{data.summary.bPercentage.toFixed(1)}% of picks</p>
          <p className="text-xs text-gray-600 mt-2">Keep in mid-tier locations</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800">C Items</h3>
          <p className="text-2xl font-bold text-red-600">{data.summary.cSkuCount} SKUs</p>
          <p className="text-sm text-red-600">{data.summary.cPercentage.toFixed(1)}% of picks</p>
          <p className="text-xs text-gray-600 mt-2">Move to reserve storage</p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Pick Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, count }) => 
                `${name}: ${value.toFixed(1)}% (${count} SKUs)`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name.charAt(0) as keyof typeof COLORS]} 
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart - Top SKUs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Top 20 SKUs by Pick Frequency</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="sku" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              fontSize={10}
            />
            <YAxis />
            <Tooltip />
            <Bar 
              dataKey="picks" 
              fill={(entry: any) => COLORS[entry.category as keyof typeof COLORS]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations Table */}
      <div className="col-span-full bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Top Re-slotting Recommendations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Picks/Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.aItems.slice(0, 5).map((item) => (
                <tr key={item.sku}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Z-99-D-01
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      A
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.picks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    Move to Golden Zone
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

### Travel Path Analysis (Post-MVP)
```javascript
// /backend/services/travelAnalysis.js
class TravelAnalyzer {
  constructor(warehouseData) {
    this.locations = warehouseData.locations;
    this.pickList = warehouseData.pickList;
    this.startPoint = { x: 0, y: 0 }; // Dock location
  }

  calculateCurrentPath() {
    // Calculate travel distance using current slotting
    let totalDistance = 0;
    let currentPosition = this.startPoint;
    const path = [currentPosition];

    for (const pick of this.pickList) {
      const location = this.locations.find(l => l.id === pick.locationId);
      const distance = this.euclideanDistance(currentPosition, location);
      totalDistance += distance;
      currentPosition = location;
      path.push(location);
    }

    // Return to start
    totalDistance += this.euclideanDistance(currentPosition, this.startPoint);
    path.push(this.startPoint);

    return { totalDistance, path };
  }

  calculateOptimizedPath() {
    // Use nearest neighbor algorithm for simple optimization
    let totalDistance = 0;
    let currentPosition = this.startPoint;
    const remainingPicks = [...this.pickList];
    const path = [currentPosition];

    while (remainingPicks.length > 0) {
      // Find nearest unpicked location
      let nearestPick = null;
      let nearestDistance = Infinity;

      for (const pick of remainingPicks) {
        const location = this.locations.find(l => l.id === pick.locationId);
        const distance = this.euclideanDistance(currentPosition, location);
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPick = pick;
        }
      }

      // Move to nearest location
      const location = this.locations.find(l => l.id === nearestPick.locationId);
      totalDistance += nearestDistance;
      currentPosition = location;
      path.push(location);
      
      // Remove from remaining picks
      const index = remainingPicks.indexOf(nearestPick);
      remainingPicks.splice(index, 1);
    }

    // Return to start
    totalDistance += this.euclideanDistance(currentPosition, this.startPoint);
    path.push(this.startPoint);

    return { totalDistance, path };
  }

  calculateSavings(currentPath, optimizedPath) {
    const distanceSaved = currentPath.totalDistance - optimizedPath.totalDistance;
    const percentageSaved = (distanceSaved / currentPath.totalDistance) * 100;
    
    // Assume average walking speed of 3 feet per second
    const timeSavedSeconds = distanceSaved / 3;
    const timeSavedMinutes = timeSavedSeconds / 60;
    
    // Assume 200 picks per day per picker
    const dailyTimeSaved = timeSavedMinutes * 200;
    
    // Assume $15/hour labor cost
    const hourlyRate = 15;
    const dailyLaborSaved = (dailyTimeSaved / 60) * hourlyRate;
    const annualSaved = dailyLaborSaved * 250; // 250 working days
    
    return {
      distanceSaved,
      percentageSaved,
      timeSavedPerPick: timeSavedMinutes,
      dailyTimeSaved,
      dailyLaborSaved,
      annualSaved
    };
  }

  euclideanDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  manhattanDistance(point1, point2) {
    // Alternative distance calculation for aisle-based warehouses
    return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
  }
}

module.exports = TravelAnalyzer;
```

### ROI Calculator Component (Post-MVP)
```typescript
// /frontend/components/ROICalculator.tsx
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, Package } from 'lucide-react';

interface ROIInputs {
  numberOfPickers: number;
  hourlyWage: number;
  picksPerDay: number;
  workingDaysPerYear: number;
  currentTravelTime: number; // minutes per pick
  optimizedTravelTime: number; // minutes per pick
}

interface ROIResults {
  timeReductionPercent: number;
  dailyHoursSaved: number;
  annualHoursSaved: number;
  annualLaborSaved: number;
  productivityIncrease: number;
  paybackPeriodMonths: number;
}

export const ROICalculator: React.FC<{ analysisData: any }> = ({ analysisData }) => {
  const [inputs, setInputs] = useState<ROIInputs>({
    numberOfPickers: 10,
    hourlyWage: 15,
    picksPerDay: 200,
    workingDaysPerYear: 250,
    currentTravelTime: analysisData?.currentTravelTime || 2.5,
    optimizedTravelTime: analysisData?.optimizedTravelTime || 1.8,
  });

  const [results, setResults] = useState<ROIResults | null>(null);

  useEffect(() => {
    calculateROI();
  }, [inputs]);

  const calculateROI = () => {
    const timeReduction = inputs.currentTravelTime - inputs.optimizedTravelTime;
    const timeReductionPercent = (timeReduction / inputs.currentTravelTime) * 100;
    
    // Daily savings
    const minutesSavedPerPicker = timeReduction * inputs.picksPerDay;
    const hoursSavedPerPicker = minutesSavedPerPicker / 60;
    const dailyHoursSaved = hoursSavedPerPicker * inputs.numberOfPickers;
    
    // Annual savings
    const annualHoursSaved = dailyHoursSaved * inputs.workingDaysPerYear;
    const annualLaborSaved = annualHoursSaved * inputs.hourlyWage;
    
    // Productivity increase
    const currentPickTime = inputs.currentTravelTime;
    const optimizedPickTime = inputs.optimizedTravelTime;
    const productivityIncrease = ((currentPickTime / optimizedPickTime) - 1) * 100;
    
    // Payback period (assuming $299/month subscription)
    const monthlySubscription = 299;
    const monthlySavings = annualLaborSaved / 12;
    const paybackPeriodMonths = monthlySubscription / monthlySavings;

    setResults({
      timeReductionPercent,
      dailyHoursSaved,
      annualHoursSaved,
      annualLaborSaved,
      productivityIncrease,
      paybackPeriodMonths,
    });
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">ROI Calculator</h2>
      
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Pickers
          </label>
          <input
            type="number"
            value={inputs.numberOfPickers}
            onChange={(e) => setInputs({...inputs, numberOfPickers: parseInt(e.target.value)})}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Wage ($)
          </label>
          <input
            type="number"
            value={inputs.hourlyWage}
            onChange={(e) => setInputs({...inputs, hourlyWage: parseFloat(e.target.value)})}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Picks Per Day Per Picker
          </label>
          <input
            type="number"
            value={inputs.picksPerDay}
            onChange={(e) => setInputs({...inputs, picksPerDay: parseInt(e.target.value)})}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Working Days Per Year
          </label>
          <input
            type="number"
            value={inputs.workingDaysPerYear}
            onChange={(e) => setInputs({...inputs, workingDaysPerYear: parseInt(e.target.value)})}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Projected Savings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Annual Savings</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(results.annualLaborSaved)}
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Hours Saved/Year</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {results.annualHoursSaved.toFixed(0)}
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Productivity Gain</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {results.productivityIncrease.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Package className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">ROI Payback</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {results.paybackPeriodMonths < 1 ? '<1' : results.paybackPeriodMonths.toFixed(1)} mo
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="mt-8 border-t pt-6">
            <h4 className="text-lg font-semibold mb-4">Detailed Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Travel Time Reduction:</span>
                <span className="font-semibold">{results.timeReductionPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Hours Saved (All Pickers):</span>
                <span className="font-semibold">{results.dailyHoursSaved.toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Savings:</span>
                <span className="font-semibold">{formatCurrency(results.annualLaborSaved / 12)}</span>
              </div>
              <div className="flex justify-between">
                <span>Software Cost (Monthly):</span>
                <span className="font-semibold">$299</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold">
                <span>Net Monthly Savings:</span>
                <span>{formatCurrency(results.annualLaborSaved / 12 - 299)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Deployment Instructions

### Local Development Setup
```bash
# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with database credentials
npm run db:migrate
npm run dev

# Frontend setup
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with API URL
npm run dev
```

### Production Deployment

#### Backend (Railway/Render)
```yaml
# railway.toml or render.yaml
services:
  - name: warehouse-slotting-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - DATABASE_URL
      - JWT_SECRET
      - AWS_S3_BUCKET
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
```

#### Frontend (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment variables to set in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-api-url.com
```

### Database Setup (Supabase)
```sql
-- Run migrations
npm run db:migrate

-- Create initial indexes
CREATE INDEX idx_pick_history_warehouse_date ON pick_history(warehouse_id, pick_date DESC);
CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_skus_warehouse ON skus(warehouse_id);

-- Enable RLS (Row Level Security)
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY warehouse_owner ON warehouses
  FOR ALL USING (user_id = auth.uid());
```

## Testing Strategy

### Unit Tests
```javascript
// /backend/tests/pickDatasetIngestor.test.js
const { Readable } = require('stream');
const PickDatasetIngestor = require('../services/pickDatasetIngestor');

describe('PickDatasetIngestor', () => {
  it('queues observations with mapped columns', async () => {
    const mocks = buildRepositories();
    const ingestor = new PickDatasetIngestor(mocks);

    const csv = Readable.from(`Location,PickCount\nA-01,42\n`);
    mocks.fs.createReadStream.mockReturnValue(csv);

    const result = await ingestor.ingest({
      datasetId: 'test',
      filePath: '/tmp/file.csv',
      datasetType: 'historical',
      columnMapping: { location: 'Location', pickCount: 'PickCount' },
    });

    expect(result.rowsQueued).toBe(1);
    expect(mocks.intensityRepository.enqueueObservation).toHaveBeenCalledWith(
      expect.objectContaining({ pickCount: 42 }),
    );
  });
});
```

### Integration Tests
```javascript
// /backend/tests/datasets.api.test.js
describe('Dataset ingestion API', () => {
  it('accepts dataset uploads and returns datasetId', async () => {
    const response = await request(app)
      .post('/api/layouts/123/datasets')
      .attach('file', 'tests/fixtures/sample.csv');
    
    expect(response.status).toBe(200);
    expect(response.body.datasetId).toBeDefined();
    expect(response.body.status).toBe('processing');
  });
});
```

## Performance Optimizations

### Database
- Stream inserts via PostgreSQL `COPY` or batched `INSERT ... ON CONFLICT` for element intensity rows
- Refresh `element_pick_rollups` materialized view asynchronously after each dataset ingestion
- Track ingestion checkpoints to resume after worker restarts

### Frontend
- Virtualize layout list & dataset history panels
- Debounce canvas edits and autosave layout snapshots
- Memoize heatmap color scale computations per dataset

### API
- Throttle dataset uploads per user (max 3 concurrent ingestions)
- Use background workers for rollup refresh to avoid API timeouts
- Cache heatmap responses per `(layoutId, datasetId)` with short TTL

## MVP Success Metrics

### Technical Metrics
- Dataset ingestion: 100k-row CSV streamed to database in < 4 minutes
- Heatmap render time < 1.5 seconds for layouts with 500 elements
- Layout autosave latency < 500 ms
- 99.5% ingestion job success rate across beta users

### Business Metrics
- 10 beta warehouses create at least one saved layout in first month
- 70% of beta warehouses upload historical pick data within two weeks
- 4 case studies demonstrating pick-density insights by end of month 3
- NPS ≥ 35 from pilot operations managers

## Next Features (Post-MVP)

1. **ABC & Demand Analytics** (Month 4)
   - Activate ABC dashboards using aggregated pick intensity
   - SKU-level velocity cohorting & recommendations

2. **Travel Path Simulation** (Month 5)
   - Compute optimized pick paths using saved layout geometry
   - Visual playback overlay on heatmap

3. **ROI & Executive Reporting** (Month 6)
   - ROI calculator integration with dataset stats
   - PDF exports & automated weekly email summaries

## Support Resources

- Documentation: `/docs/api`
- Sample CSV files: `/samples`
- Video tutorials: Record 5-minute setup guide
- Email support: support@warehouseslotting.com
- Community forum: Discord server

## License and Copyright

```
Copyright (c) 2024 Warehouse Slotting Solutions
All rights reserved. Proprietary and confidential.
```
