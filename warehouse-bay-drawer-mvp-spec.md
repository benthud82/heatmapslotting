# Warehouse Bay Drawer MVP - Technical Implementation Guide

## Project Overview
Build a simple web-based tool that allows users to draw and save warehouse bay layouts. Users can create accounts, draw rectangular bays on a canvas, label them, and save/load their layouts. This is the foundational step before adding heatmap visualization.

## Technology Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL (or SQLite for initial development)
- **Authentication**: JWT tokens with bcrypt for password hashing

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI Library**: Tailwind CSS
- **Canvas Library**: react-konva for drawing interface
- **State Management**: React useState/useContext (no external state library needed)

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (backend)
- **Database**: Supabase or Neon for managed PostgreSQL

## Database Schema

```sql
-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Saved layouts
CREATE TABLE layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    canvas_width INTEGER NOT NULL DEFAULT 1200,
    canvas_height INTEGER NOT NULL DEFAULT 800,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bay elements drawn on the layout
CREATE TABLE bays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    x_coordinate DECIMAL(10,2) NOT NULL,
    y_coordinate DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    rotation DECIMAL(5,2) DEFAULT 0,
    color VARCHAR(20) DEFAULT '#60a5fa',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_layouts_user ON layouts(user_id);
CREATE INDEX idx_bays_layout ON bays(layout_id);
```

## API Endpoints

### Authentication
```typescript
// POST /api/auth/register
interface RegisterRequest {
  email: string;
  password: string;
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
  };
}
```

### Layouts
```typescript
// POST /api/layouts
interface CreateLayoutRequest {
  name: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

// GET /api/layouts
// Returns array of user's layouts

// GET /api/layouts/:id
// Returns layout with all bays

// PUT /api/layouts/:id
interface UpdateLayoutRequest {
  name?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

// DELETE /api/layouts/:id
```

### Bays
```typescript
// POST /api/layouts/:layoutId/bays
interface CreateBayRequest {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color?: string;
}

// PUT /api/bays/:id
interface UpdateBayRequest {
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
}

// DELETE /api/bays/:id
```

## Core Feature Implementation

### 1. Bay Drawing Canvas Component
```typescript
// /frontend/components/BayDrawerCanvas.tsx
import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { nanoid } from 'nanoid';

interface Bay {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}

interface BayDrawerCanvasProps {
  layoutId: string | null;
  bays: Bay[];
  onBaysChange(bays: Bay[]): void;
}

export const BayDrawerCanvas: React.FC<BayDrawerCanvasProps> = ({
  layoutId,
  bays,
  onBaysChange,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedBayId, setSelectedBayId] = useState<string | null>(null);

  const handleStageMouseDown = (evt: any) => {
    const stage = evt.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    // Check if clicking on existing bay
    const clickedBay = bays.find(bay => {
      const x = bay.x;
      const y = bay.y;
      const w = bay.width;
      const h = bay.height;
      return (
        pointerPosition.x >= x &&
        pointerPosition.x <= x + w &&
        pointerPosition.y >= y &&
        pointerPosition.y <= y + h
      );
    });

    if (clickedBay) {
      setSelectedBayId(clickedBay.id);
      return;
    }

    // Start drawing new bay
    setSelectedBayId(null);
    setIsDrawing(true);
    setDrawStart(pointerPosition);
  };

  const handleStageMouseMove = (evt: any) => {
    if (!isDrawing || !drawStart) return;
    const stage = evt.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const newBay: Bay = {
      id: nanoid(),
      label: `Bay ${bays.length + 1}`,
      x: Math.min(drawStart.x, pointerPosition.x),
      y: Math.min(drawStart.y, pointerPosition.y),
      width: Math.abs(pointerPosition.x - drawStart.x),
      height: Math.abs(pointerPosition.y - drawStart.y),
      rotation: 0,
      color: '#60a5fa',
    };

    // Update last bay or add new one
    const updatedBays = [...bays];
    const lastBay = updatedBays[updatedBays.length - 1];
    if (lastBay && lastBay.id.startsWith('temp-')) {
      updatedBays[updatedBays.length - 1] = { ...newBay, id: lastBay.id };
    } else {
      updatedBays.push({ ...newBay, id: `temp-${nanoid()}` });
    }
    onBaysChange(updatedBays);
  };

  const handleStageMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setDrawStart(null);
      // Remove temp ID and save to backend if layoutId exists
      if (layoutId) {
        const tempBay = bays.find(b => b.id.startsWith('temp-'));
        if (tempBay) {
          // Call API to save bay
          saveBayToBackend(tempBay, layoutId);
        }
      }
    }
  };

  const handleBayDoubleClick = (bayId: string) => {
    const newLabel = prompt('Enter bay label:', bays.find(b => b.id === bayId)?.label || '');
    if (newLabel) {
      const updatedBays = bays.map(bay =>
        bay.id === bayId ? { ...bay, label: newLabel } : bay
      );
      onBaysChange(updatedBays);
      if (layoutId) {
        updateBayInBackend(bayId, { label: newLabel });
      }
    }
  };

  const handleBayDelete = (bayId: string) => {
    if (confirm('Delete this bay?')) {
      const updatedBays = bays.filter(bay => bay.id !== bayId);
      onBaysChange(updatedBays);
      if (layoutId) {
        deleteBayFromBackend(bayId);
      }
    }
  };

  const saveBayToBackend = async (bay: Bay, layoutId: string) => {
    try {
      const response = await fetch(`/api/layouts/${layoutId}/bays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: bay.label,
          x: bay.x,
          y: bay.y,
          width: bay.width,
          height: bay.height,
          rotation: bay.rotation,
          color: bay.color,
        }),
      });
      const savedBay = await response.json();
      // Replace temp bay with saved bay
      const updatedBays = bays.map(b =>
        b.id === bay.id ? { ...bay, id: savedBay.id } : b
      );
      onBaysChange(updatedBays);
    } catch (error) {
      console.error('Failed to save bay:', error);
    }
  };

  const updateBayInBackend = async (bayId: string, updates: Partial<Bay>) => {
    try {
      await fetch(`/api/bays/${bayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Failed to update bay:', error);
    }
  };

  const deleteBayFromBackend = async (bayId: string) => {
    try {
      await fetch(`/api/bays/${bayId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete bay:', error);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <Stage
        width={1200}
        height={800}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {bays.map((bay) => (
            <React.Fragment key={bay.id}>
              <Rect
                x={bay.x}
                y={bay.y}
                width={bay.width}
                height={bay.height}
                rotation={bay.rotation}
                fill={bay.color}
                opacity={0.6}
                stroke={selectedBayId === bay.id ? '#000' : '#333'}
                strokeWidth={selectedBayId === bay.id ? 3 : 1}
                onDblClick={() => handleBayDoubleClick(bay.id)}
              />
              <Text
                x={bay.x + 5}
                y={bay.y + 5}
                text={bay.label}
                fontSize={14}
                fill="#111827"
                fontStyle="bold"
              />
              {selectedBayId === bay.id && (
                <Text
                  x={bay.x + bay.width - 60}
                  y={bay.y + 5}
                  text="[Delete]"
                  fontSize={12}
                  fill="#ef4444"
                  onClick={() => handleBayDelete(bay.id)}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};
```

### 2. Layout Management Component
```typescript
// /frontend/components/LayoutManager.tsx
import React, { useState, useEffect } from 'react';
import { BayDrawerCanvas } from './BayDrawerCanvas';

interface Layout {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
}

interface Bay {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}

export const LayoutManager: React.FC = () => {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [bays, setBays] = useState<Bay[]>([]);
  const [layoutName, setLayoutName] = useState('');

  useEffect(() => {
    loadLayouts();
  }, []);

  useEffect(() => {
    if (currentLayoutId) {
      loadBays(currentLayoutId);
    } else {
      setBays([]);
    }
  }, [currentLayoutId]);

  const loadLayouts = async () => {
    try {
      const response = await fetch('/api/layouts');
      const data = await response.json();
      setLayouts(data);
    } catch (error) {
      console.error('Failed to load layouts:', error);
    }
  };

  const loadBays = async (layoutId: string) => {
    try {
      const response = await fetch(`/api/layouts/${layoutId}`);
      const layout = await response.json();
      setBays(layout.bays || []);
      setLayoutName(layout.name);
    } catch (error) {
      console.error('Failed to load bays:', error);
    }
  };

  const createNewLayout = async () => {
    const name = prompt('Enter layout name:');
    if (!name) return;

    try {
      const response = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const newLayout = await response.json();
      setLayouts([...layouts, newLayout]);
      setCurrentLayoutId(newLayout.id);
      setBays([]);
      setLayoutName(name);
    } catch (error) {
      console.error('Failed to create layout:', error);
    }
  };

  const saveLayout = async () => {
    if (!currentLayoutId) return;

    try {
      await fetch(`/api/layouts/${currentLayoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: layoutName }),
      });
      alert('Layout saved!');
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warehouse Bay Drawer</h1>
        <div className="flex gap-2">
          <select
            value={currentLayoutId || ''}
            onChange={(e) => setCurrentLayoutId(e.target.value || null)}
            className="border rounded px-3 py-2"
          >
            <option value="">Select a layout...</option>
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
          <button
            onClick={createNewLayout}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            New Layout
          </button>
          {currentLayoutId && (
            <button
              onClick={saveLayout}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Save Layout
            </button>
          )}
        </div>
      </div>

      {currentLayoutId && (
        <div className="mb-4">
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="border rounded px-3 py-2 w-64"
            placeholder="Layout name"
          />
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-4">
          Click and drag to draw a bay. Double-click a bay to rename it. Click a bay to select it, then click [Delete] to remove it.
        </p>
        <BayDrawerCanvas
          layoutId={currentLayoutId}
          bays={bays}
          onBaysChange={setBays}
        />
      </div>
    </div>
  );
};
```

### 3. Backend API Routes (Express.js)
```javascript
// /backend/routes/layouts.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../db');

// Get all layouts for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, canvas_width, canvas_height, created_at FROM layouts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single layout with bays
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const layoutResult = await db.query(
      'SELECT * FROM layouts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (layoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const baysResult = await db.query(
      'SELECT * FROM bays WHERE layout_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({
      ...layoutResult.rows[0],
      bays: baysResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new layout
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, canvasWidth = 1200, canvasHeight = 800 } = req.body;
    const result = await db.query(
      'INSERT INTO layouts (user_id, name, canvas_width, canvas_height) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, canvasWidth, canvasHeight]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update layout
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, canvasWidth, canvasHeight } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (canvasWidth !== undefined) {
      updates.push(`canvas_width = $${paramCount++}`);
      values.push(canvasWidth);
    }
    if (canvasHeight !== undefined) {
      updates.push(`canvas_height = $${paramCount++}`);
      values.push(canvasHeight);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id, req.user.id);

    const result = await db.query(
      `UPDATE layouts SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete layout
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM layouts WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json({ message: 'Layout deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

```javascript
// /backend/routes/bays.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../db');

// Create bay
router.post('/layouts/:layoutId/bays', authenticateToken, async (req, res) => {
  try {
    // Verify layout belongs to user
    const layoutCheck = await db.query(
      'SELECT id FROM layouts WHERE id = $1 AND user_id = $2',
      [req.params.layoutId, req.user.id]
    );

    if (layoutCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const { label, x, y, width, height, rotation = 0, color = '#60a5fa' } = req.body;
    const result = await db.query(
      'INSERT INTO bays (layout_id, label, x_coordinate, y_coordinate, width, height, rotation, color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.params.layoutId, label, x, y, width, height, rotation, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bay
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Verify bay belongs to user's layout
    const bayCheck = await db.query(
      'SELECT b.id FROM bays b JOIN layouts l ON b.layout_id = l.id WHERE b.id = $1 AND l.user_id = $2',
      [req.params.id, req.user.id]
    );

    if (bayCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bay not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key === 'x' ? 'x_coordinate' : key === 'y' ? 'y_coordinate' : key;
        updates.push(`${dbKey} = $${paramCount++}`);
        values.push(value);
      }
    });

    updates.push('updated_at = NOW()');
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE bays SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bay
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bayCheck = await db.query(
      'SELECT b.id FROM bays b JOIN layouts l ON b.layout_id = l.id WHERE b.id = $1 AND l.user_id = $2',
      [req.params.id, req.user.id]
    );

    if (bayCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Bay not found' });
    }

    await db.query('DELETE FROM bays WHERE id = $1', [req.params.id]);
    res.json({ message: 'Bay deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
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

### Database Migration
```sql
-- Run the schema SQL from Database Schema section above
```

## MVP Success Metrics

### Technical Metrics
- Layout save/load latency < 500ms
- Bay drawing responsiveness < 50ms
- 99% uptime

### Business Metrics
- Users can successfully create and save at least one layout
- Users can draw and label at least 10 bays per layout
- Zero data loss on layout saves

## Next Features (Post-MVP)

1. **Heatmap Visualization** (Phase 2)
   - Color-code bays based on pick data
   - Import CSV with pick counts per bay

2. **Enhanced Drawing Tools** (Phase 2)
   - Resize bays by dragging corners
   - Rotate bays
   - Copy/paste bays
   - Undo/redo functionality

3. **Export/Import** (Phase 2)
   - Export layout as image
   - Export layout as JSON
   - Import layout from JSON

