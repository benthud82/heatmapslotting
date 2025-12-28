# Final Implementation Plan: Production-Ready Warehouse Heatmap Application

> **Target:** Enable non-technical warehouse managers to create a heatmap in ~10 minutes
> **Current State:** 30-45 minutes for first-time users
> **Goal State:** 8-12 minutes for most users

---

## Pre-Implementation: File Cleanup

### Files to DELETE (obsolete planning/test documents):

```
DELETE: C:\xampp\htdocs\heatmapslotting\MVP_SUMMARY.md
DELETE: C:\xampp\htdocs\heatmapslotting\TESTING_PLAN.md
DELETE: C:\xampp\htdocs\heatmapslotting\saas.md
DELETE: C:\xampp\htdocs\heatmapslotting\smart-placement-implementation.md
DELETE: C:\xampp\htdocs\heatmapslotting\test_item_picks.csv
DELETE: C:\xampp\htdocs\heatmapslotting\docs\onboarding-implementation-plan.md
DELETE: C:\xampp\htdocs\heatmapslotting\docs\slot_justification.md
DELETE: C:\xampp\htdocs\heatmapslotting\docs\USER_TESTING_GUIDE.md
```

### Files to KEEP:
- `CLAUDE.md` - Project instructions (update after implementation)
- `sample-picks.csv` - Useful sample data for users
- `sample_warehouse.dxf` - Sample DXF file for import testing

---

## Phase 1: Critical Security Fixes (USER TEST POINT)

### 1.1 Remove Secrets from Repository

**File:** `backend/.env`
**File:** `.gitignore`

**Logic:**
1. The `.env` file contains exposed credentials (DATABASE_URL, JWT_SECRET, STRIPE keys)
2. Add `.env` to `.gitignore` if not already present
3. Create `.env.example` with placeholder values for documentation

**Implementation:**
```javascript
// .gitignore - add these lines:
.env
.env.local
.env.production

// Create .env.example with:
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-jwt-secret-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**Verification:** Run `git status` - `.env` should not appear in tracked files

---

### 1.2 Add Input Validation Schema

**File:** `backend/routes/bays.js`
**File:** `backend/routes/layouts.js`
**File:** `backend/routes/picks.js`
**New File:** `backend/middleware/validate.js`

**Logic:**
The app accepts user input without validation. Malformed data can cause crashes or security issues.

**Implementation - Create validation middleware:**
```javascript
// backend/middleware/validate.js
const validateElement = (req, res, next) => {
  const { x_coordinate, y_coordinate, width, height, label, element_type } = req.body;

  // Type checks
  if (typeof x_coordinate !== 'number' || !isFinite(x_coordinate)) {
    return res.status(400).json({ error: 'x_coordinate must be a finite number' });
  }
  if (typeof y_coordinate !== 'number' || !isFinite(y_coordinate)) {
    return res.status(400).json({ error: 'y_coordinate must be a finite number' });
  }

  // Range checks
  if (x_coordinate < 0 || x_coordinate > 10000) {
    return res.status(400).json({ error: 'x_coordinate must be between 0 and 10000' });
  }
  if (y_coordinate < 0 || y_coordinate > 10000) {
    return res.status(400).json({ error: 'y_coordinate must be between 0 and 10000' });
  }
  if (width <= 0 || width > 1000) {
    return res.status(400).json({ error: 'width must be between 1 and 1000' });
  }
  if (height <= 0 || height > 1000) {
    return res.status(400).json({ error: 'height must be between 1 and 1000' });
  }

  // String length checks
  if (label && label.length > 100) {
    return res.status(400).json({ error: 'label must be 100 characters or less' });
  }

  // Enum checks
  const validTypes = ['bay', 'flow_rack', 'pallet', 'text', 'line', 'arrow'];
  if (element_type && !validTypes.includes(element_type)) {
    return res.status(400).json({ error: `element_type must be one of: ${validTypes.join(', ')}` });
  }

  next();
};

const validateLayout = (req, res, next) => {
  const { name, canvas_width, canvas_height } = req.body;

  if (name && (typeof name !== 'string' || name.length > 255)) {
    return res.status(400).json({ error: 'name must be a string of 255 characters or less' });
  }
  if (canvas_width && (canvas_width < 100 || canvas_width > 10000)) {
    return res.status(400).json({ error: 'canvas_width must be between 100 and 10000' });
  }
  if (canvas_height && (canvas_height < 100 || canvas_height > 10000)) {
    return res.status(400).json({ error: 'canvas_height must be between 100 and 10000' });
  }

  next();
};

module.exports = { validateElement, validateLayout };
```

**Apply to routes in `bays.js`:**
```javascript
const { validateElement } = require('../middleware/validate');

router.post('/', authMiddleware, validateElement, async (req, res, next) => {
  // existing code
});

router.put('/:id', authMiddleware, validateElement, async (req, res, next) => {
  // existing code
});
```

**Verification:**
1. POST invalid data (negative width) → should return 400 error
2. POST valid data → should succeed

---

### 1.3 Add Missing Database Tables

**File:** `backend/scripts/migrate.sql`

**Logic:**
Backend code references tables (`locations`, `items`, `item_pick_transactions`, `route_markers`) that don't exist in the schema.

**Implementation - Add to migrate.sql:**
```sql
-- ============================================
-- MISSING TABLES - ADD THESE
-- ============================================

-- Locations table (for item-level tracking)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    element_id UUID NOT NULL REFERENCES warehouse_elements(id) ON DELETE CASCADE,
    location_id VARCHAR(100) NOT NULL,
    label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(layout_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_locations_layout ON locations(layout_id);
CREATE INDEX IF NOT EXISTS idx_locations_element ON locations(element_id);

-- Items table (SKU tracking)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    description TEXT,
    current_location_id UUID REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(layout_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_items_layout ON items(layout_id);
CREATE INDEX IF NOT EXISTS idx_items_location ON items(current_location_id);

-- Item pick transactions (item-level picks)
CREATE TABLE IF NOT EXISTS item_pick_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    element_id UUID NOT NULL REFERENCES warehouse_elements(id) ON DELETE CASCADE,
    pick_date DATE NOT NULL,
    pick_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, location_id, pick_date)
);

CREATE INDEX IF NOT EXISTS idx_item_picks_layout_date ON item_pick_transactions(layout_id, pick_date);
CREATE INDEX IF NOT EXISTS idx_item_picks_item ON item_pick_transactions(item_id);

-- Route markers table
CREATE TABLE IF NOT EXISTS route_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    marker_type VARCHAR(20) NOT NULL CHECK (marker_type IN ('start_point', 'stop_point', 'cart_parking')),
    label VARCHAR(100),
    x_coordinate DECIMAL(10,2) NOT NULL,
    y_coordinate DECIMAL(10,2) NOT NULL,
    sequence_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_markers_layout ON route_markers(layout_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_pick_transactions_layout_date ON pick_transactions(layout_id, pick_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_elements_label ON warehouse_elements(layout_id, label);

-- Enable RLS on new tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_pick_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_markers ENABLE ROW LEVEL SECURITY;
```

**Verification:**
1. Run the SQL in Supabase SQL Editor
2. Query `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
3. Confirm all 4 new tables exist

---

## USER TEST POINT #1: Security Baseline
- [ ] Backend starts without errors
- [ ] `.env` not tracked in git
- [ ] Invalid API requests return 400 errors
- [ ] Database tables all exist

---

## Phase 2: UX Quick Wins for 10-Minute Goal (USER TEST POINT)

### 2.1 Add Layout Templates

**File:** `frontend/lib/templates/index.ts` (exists, enhance it)
**File:** `frontend/components/home/TemplateSelector.tsx` (NEW)
**File:** `frontend/app/page.tsx` (modify home page)

**Logic:**
Users currently must design layouts from scratch. Templates let them start with pre-built layouts.

**Implementation - TemplateSelector component:**
```typescript
// frontend/components/home/TemplateSelector.tsx
'use client';

import { useState } from 'react';
import { LAYOUT_TEMPLATES } from '@/lib/templates';
import { layoutApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface TemplateSelectorProps {
  onClose: () => void;
}

export default function TemplateSelector({ onClose }: TemplateSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectTemplate = async (templateId: string) => {
    setLoading(templateId);
    try {
      const template = LAYOUT_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      // Create new layout with template elements
      const layout = await layoutApi.createLayout({
        name: `${template.name} Layout`,
        canvas_width: 1200,
        canvas_height: 800
      });

      // Bulk create elements from template
      for (const element of template.elements) {
        await layoutApi.createElement(layout.id, element);
      }

      // Navigate to designer
      router.push(`/designer?layout=${layout.id}`);
    } catch (error) {
      console.error('Failed to create from template:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Choose a Template</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <p className="text-slate-400 mb-6">
          Start with a pre-built layout or create from scratch
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Quick Grid Template - Most Common */}
          <button
            onClick={() => handleSelectTemplate('quick-grid')}
            disabled={loading !== null}
            className="p-4 border border-cyan-500/50 rounded-lg hover:border-cyan-500 text-left"
          >
            <div className="text-cyan-400 text-2xl mb-2">▦</div>
            <h3 className="text-white font-medium">Quick Grid (3×5)</h3>
            <p className="text-slate-400 text-sm">15 bays in a simple grid. Perfect for small warehouses.</p>
          </button>

          {LAYOUT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              disabled={loading !== null}
              className="p-4 border border-slate-700 rounded-lg hover:border-slate-500 text-left"
            >
              <div className="text-slate-400 text-2xl mb-2">{template.icon || '📦'}</div>
              <h3 className="text-white font-medium">{template.name}</h3>
              <p className="text-slate-400 text-sm">{template.description}</p>
            </button>
          ))}

          {/* Empty Layout Option */}
          <button
            onClick={() => router.push('/designer')}
            className="p-4 border border-dashed border-slate-600 rounded-lg hover:border-slate-400 text-left"
          >
            <div className="text-slate-500 text-2xl mb-2">+</div>
            <h3 className="text-slate-300 font-medium">Start from Scratch</h3>
            <p className="text-slate-500 text-sm">Design your own custom layout</p>
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Add Quick Grid template to templates/index.ts:**
```typescript
// Add to LAYOUT_TEMPLATES array:
{
  id: 'quick-grid',
  name: 'Quick Grid',
  description: '15 bays in a 3×5 grid layout',
  icon: '▦',
  elements: generateQuickGrid(3, 5, 100), // 3 columns, 5 rows, 100px spacing
  routeMarkers: [
    { type: 'start_point', x: 50, y: 400, label: 'Start' },
    { type: 'stop_point', x: 450, y: 400, label: 'Stop' },
    { type: 'cart_parking', x: 50, y: 50, label: 'Cart' }
  ]
}

// Helper function:
function generateQuickGrid(cols: number, rows: number, spacing: number): TemplateElement[] {
  const elements: TemplateElement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col + 1;
      elements.push({
        type: 'bay',
        x: 100 + col * spacing,
        y: 100 + row * spacing,
        width: 48,
        height: 96,
        label: `B${index}`,
        color: '#3B82F6'
      });
    }
  }
  return elements;
}
```

**Verification:**
1. Home page shows "Create from Template" button
2. Clicking opens template selector modal
3. Selecting "Quick Grid" creates layout with 15 pre-named bays
4. User lands in designer with layout already populated

---

### 2.2 Add Smart Element Name Matching for CSV Upload

**File:** `frontend/lib/csvValidation.ts` (modify)
**File:** `frontend/components/upload/UploadValidateStep.tsx` (modify)

**Logic:**
When CSV contains "Bay01" but layout has "B1", validation fails. Add fuzzy matching with suggestions.

**Implementation - Add to csvValidation.ts:**
```typescript
// Add fuzzy matching function
function findBestMatch(input: string, validNames: Set<string>): { match: string | null; score: number } {
  const normalized = input.toLowerCase().replace(/[-_\s]/g, '');

  // Extract numeric portion
  const numMatch = normalized.match(/(\d+)/);
  const inputNum = numMatch ? numMatch[1] : '';

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const name of validNames) {
    const nameNorm = name.toLowerCase().replace(/[-_\s]/g, '');
    const nameNum = nameNorm.match(/(\d+)/)?.[1] || '';

    // Exact match
    if (nameNorm === normalized) {
      return { match: name, score: 1 };
    }

    // Number match (B1 matches Bay1, Bay01, BAY_1, etc.)
    if (inputNum && nameNum && inputNum === nameNum) {
      const score = 0.8;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }

    // Prefix match
    if (normalized.startsWith(nameNorm) || nameNorm.startsWith(normalized)) {
      const score = 0.6;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }
  }

  return { match: bestMatch, score: bestScore };
}

// Modify validateRow to use fuzzy matching
export function validateItemCSVRow(
  row: CSVRow,
  validElementNames: Set<string>,
  rowIndex: number,
  options: { useFuzzyMatch?: boolean } = {}
): RowValidationResult {
  const errors: string[] = [];
  let suggestedFix: { field: string; original: string; suggested: string } | null = null;

  // ... existing validation ...

  // Element name validation with fuzzy matching
  const elementName = row.element_name?.trim();
  if (elementName) {
    const exactMatch = validElementNames.has(elementName) ||
                       validElementNames.has(elementName.toLowerCase());

    if (!exactMatch && options.useFuzzyMatch) {
      const { match, score } = findBestMatch(elementName, validElementNames);
      if (match && score >= 0.6) {
        suggestedFix = {
          field: 'element_name',
          original: elementName,
          suggested: match
        };
        // Don't add error, just warning
      } else {
        errors.push(`Element "${elementName}" not found in layout`);
      }
    } else if (!exactMatch) {
      errors.push(`Element "${elementName}" not found in layout`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestedFix
  };
}
```

**Add UI for suggestions in UploadValidateStep.tsx:**
```typescript
// Add state for suggestions
const [nameSuggestions, setNameSuggestions] = useState<Map<string, string>>(new Map());

// Show suggestions UI when mismatches found
{nameSuggestions.size > 0 && (
  <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4 mb-4">
    <h4 className="text-amber-400 font-medium mb-2">Name Suggestions</h4>
    <p className="text-slate-400 text-sm mb-3">
      Some element names in your CSV don't match your layout. Apply these fixes?
    </p>
    <div className="space-y-2">
      {Array.from(nameSuggestions).map(([original, suggested]) => (
        <div key={original} className="flex items-center gap-2">
          <span className="text-red-400 line-through">{original}</span>
          <span className="text-slate-400">→</span>
          <span className="text-green-400">{suggested}</span>
        </div>
      ))}
    </div>
    <button
      onClick={applyAllSuggestions}
      className="mt-3 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500"
    >
      Apply All Fixes
    </button>
  </div>
)}
```

**Verification:**
1. Upload CSV with "Bay01" when layout has "B1"
2. System shows suggestion: "Bay01 → B1"
3. User clicks "Apply All Fixes"
4. Validation passes

---

### 2.3 Add Downloadable CSV Template on Home Page

**File:** `frontend/app/page.tsx` (modify)
**File:** `frontend/components/home/QuickActions.tsx` (NEW or modify existing)

**Logic:**
Users struggle to format CSV correctly. Provide a downloadable template with correct headers.

**Implementation:**
```typescript
// Add to home page or quick actions component
const downloadCSVTemplate = (format: 'item' | 'element') => {
  let content: string;
  let filename: string;

  if (format === 'item') {
    content = `item_id,location_id,element_name,date,pick_count
SKU-001,LOC-A01,B1,2024-01-15,42
SKU-002,LOC-A02,B1,2024-01-15,28
SKU-003,LOC-B01,B2,2024-01-15,15`;
    filename = 'pick-data-template-item-level.csv';
  } else {
    content = `element_name,date,pick_count
B1,2024-01-15,150
B2,2024-01-15,89
B3,2024-01-15,45`;
    filename = 'pick-data-template-element-level.csv';
  }

  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// UI Component
<div className="bg-slate-800 rounded-lg p-4">
  <h3 className="text-white font-medium mb-2">CSV Templates</h3>
  <p className="text-slate-400 text-sm mb-3">
    Download a template with the correct format for your pick data
  </p>
  <div className="flex gap-2">
    <button
      onClick={() => downloadCSVTemplate('item')}
      className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-500"
    >
      Item-Level Template
    </button>
    <button
      onClick={() => downloadCSVTemplate('element')}
      className="px-3 py-1.5 bg-slate-600 text-white text-sm rounded hover:bg-slate-500"
    >
      Element-Level Template
    </button>
  </div>
</div>
```

**Verification:**
1. Home page shows "Download Template" buttons
2. Clicking downloads CSV file with correct headers
3. Template includes sample rows as examples

---

### 2.4 Add "Easy Mode" Toggle to Designer

**File:** `frontend/components/designer/Sidebar.tsx` (modify)

**Logic:**
Designer shows too many tools (Bay, Flow Rack, Pallet, Text, Line, Arrow). New users only need basics.

**Implementation:**
```typescript
// Add state
const [easyMode, setEasyMode] = useState(true);

// Filter tools based on mode
const basicTools = ['bay', 'flow_rack', 'pallet'];
const advancedTools = ['text', 'line', 'arrow'];
const visibleTools = easyMode ? basicTools : [...basicTools, ...advancedTools];

// Add toggle UI at top of sidebar
<div className="flex items-center justify-between mb-4">
  <span className="text-slate-400 text-sm">Mode</span>
  <button
    onClick={() => setEasyMode(!easyMode)}
    className={`px-2 py-1 text-xs rounded ${
      easyMode ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'
    }`}
  >
    {easyMode ? 'Easy' : 'Advanced'}
  </button>
</div>

// Filter tool buttons
{ELEMENT_TYPES
  .filter(type => visibleTools.includes(type.id))
  .map(type => (
    <ToolButton key={type.id} {...type} />
  ))
}

// Show hint for new users
{easyMode && (
  <p className="text-slate-500 text-xs mt-4">
    Switch to Advanced mode for text labels, lines, and arrows
  </p>
)}
```

**Verification:**
1. Designer opens in "Easy Mode" by default
2. Only Bay, Flow Rack, Pallet tools visible
3. Toggle to "Advanced" shows all tools
4. Mode persists in session

---

## USER TEST POINT #2: UX Improvements
- [ ] Templates available on home page
- [ ] Quick Grid creates 15 pre-named bays
- [ ] CSV upload suggests name fixes
- [ ] CSV templates downloadable
- [ ] Designer has Easy Mode toggle
- [ ] Time to first heatmap: < 15 minutes

---

## Phase 3: Data Pipeline & Export (USER TEST POINT)

### 3.1 Add Excel (.xlsx) Import Support

**File:** `frontend/lib/csvValidation.ts` (modify)
**File:** `frontend/components/upload/UploadValidateStep.tsx` (modify)
**Package:** Add `xlsx` package to frontend

**Logic:**
Non-technical users often have data in Excel, not CSV. Support .xlsx files.

**Implementation:**
```bash
cd frontend && npm install xlsx
```

```typescript
// frontend/lib/excelParser.ts
import * as XLSX from 'xlsx';

export async function parseExcelFile(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json<CSVRow>(sheet, {
          raw: false,
          defval: ''
        });

        // Normalize headers
        const normalized = rows.map(row => {
          const newRow: CSVRow = {};
          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
            newRow[normalizedKey] = value;
          }
          return newRow;
        });

        resolve(normalized);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
```

**Update file input to accept xlsx:**
```typescript
// In UploadValidateStep.tsx
<input
  type="file"
  accept=".csv,.xlsx,.xls"
  onChange={handleFileSelect}
/>

// Update file handler
const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  let rows: CSVRow[];

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    rows = await parseExcelFile(file);
  } else {
    rows = await parseCSVFile(file);
  }

  // Continue with validation...
};
```

**Verification:**
1. Upload .xlsx file
2. Data parsed correctly
3. Same validation as CSV
4. Supports both formats

---

### 3.2 Add Data Export as CSV

**File:** `frontend/components/dashboard/ExportButton.tsx` (NEW)
**File:** `frontend/app/dashboard/page.tsx` (modify)

**Logic:**
Users can see heatmap but can't export the analyzed data for reporting.

**Implementation:**
```typescript
// frontend/components/dashboard/ExportButton.tsx
'use client';

import { useState } from 'react';

interface ExportButtonProps {
  layoutId: string;
  data: AggregatedPickData[];
  items?: ItemData[];
}

export default function ExportButton({ layoutId, data, items }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);

    try {
      let csvContent: string;
      let filename: string;

      if (items && items.length > 0) {
        // Export item-level data
        csvContent = 'item_id,location_id,element_name,total_picks,avg_picks_per_day,velocity_tier,recommendation\n';
        items.forEach(item => {
          csvContent += `${item.item_id},${item.location_id},${item.element_name},${item.total_picks},${item.avg_picks.toFixed(1)},${item.tier},${item.recommendation}\n`;
        });
        filename = `velocity-analysis-items-${layoutId}.csv`;
      } else {
        // Export element-level data
        csvContent = 'element_name,total_picks,avg_picks_per_day,velocity_tier\n';
        data.forEach(d => {
          csvContent += `${d.label},${d.totalPicks},${d.avgPicks.toFixed(1)},${d.tier}\n`;
        });
        filename = `velocity-analysis-elements-${layoutId}.csv`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={exporting}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50"
    >
      {exporting ? 'Exporting...' : 'Export Data (CSV)'}
    </button>
  );
}
```

**Verification:**
1. Dashboard shows "Export Data" button
2. Clicking downloads CSV with velocity analysis
3. Includes recommendations and tiers

---

### 3.3 Fix N+1 Query in CSV Upload

**File:** `backend/routes/picks.js`

**Logic:**
Current code does separate SELECT queries after bulk inserts. Use RETURNING clause instead.

**Implementation - Optimize the bulk insert:**
```javascript
// Before (N+1 pattern):
await query('INSERT INTO locations (...) VALUES (...)');
const locationResult = await query('SELECT id, location_id FROM locations WHERE layout_id = $1', [layoutId]);

// After (single query with RETURNING):
const insertQuery = `
  INSERT INTO locations (layout_id, element_id, location_id, label)
  VALUES ${locationValues.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
  ON CONFLICT (layout_id, location_id) DO UPDATE SET label = EXCLUDED.label
  RETURNING id, location_id
`;
const locationResult = await query(insertQuery, locationParams);

// Build map directly from RETURNING results
const locationMap = new Map(locationResult.rows.map(r => [r.location_id, r.id]));
```

**Verification:**
1. Upload 1000-row CSV
2. Check query logs - should see fewer SELECT queries
3. Upload time reduced

---

## USER TEST POINT #3: Data Pipeline
- [ ] Excel files (.xlsx) upload and parse correctly
- [ ] Export button downloads CSV with analysis
- [ ] Large CSV uploads complete in < 30 seconds

---

## Phase 4: Production Hardening (USER TEST POINT)

### 4.1 Add Audit Logging

**File:** `backend/middleware/audit.js` (NEW)
**File:** `backend/scripts/migrate.sql` (add table)
**File:** `backend/routes/*.js` (apply middleware)

**Logic:**
No record of who changed what. Add audit trail for compliance and debugging.

**Implementation:**
```sql
-- Add to migrate.sql
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
```

```javascript
// backend/middleware/audit.js
const { query } = require('../db');

const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await query(
            `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.user?.id,
              action,
              resourceType,
              req.params?.id || data?.id,
              JSON.stringify({ body: req.body, params: req.params }),
              req.ip
            ]
          );
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = { auditLog };
```

**Apply to critical routes:**
```javascript
// In routes/layouts.js
const { auditLog } = require('../middleware/audit');

router.delete('/:id', authMiddleware, auditLog('DELETE', 'layout'), async (req, res, next) => {
  // existing code
});
```

**Verification:**
1. Delete a layout
2. Query audit_log table
3. See delete action recorded with user and timestamp

---

### 4.2 Add Pagination to List Endpoints

**File:** `backend/routes/layouts.js`
**File:** `backend/routes/picks.js`

**Logic:**
Endpoints return all data. Add pagination to prevent memory issues.

**Implementation:**
```javascript
// In layouts.js
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      query('SELECT COUNT(*) FROM layouts WHERE user_id = $1', [userId]),
      query(
        `SELECT * FROM layouts WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      )
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});
```

**Verification:**
1. Create 25 layouts
2. GET /api/layouts?page=1&limit=10
3. Returns 10 layouts with pagination metadata
4. page=2 returns next 10

---

### 4.3 Update CLAUDE.md

**File:** `CLAUDE.md`

**Logic:**
Update project documentation to reflect current state and new features.

**Key updates:**
- Add new tables to schema section
- Add validation middleware documentation
- Update file structure
- Add pagination query parameters
- Document audit logging

---

## USER TEST POINT #4: Production Ready
- [ ] Audit log captures all data modifications
- [ ] List endpoints return paginated results
- [ ] Documentation updated
- [ ] No console errors in production build

---

## Final Verification Checklist

### Security
- [ ] `.env` not in git
- [ ] All API inputs validated
- [ ] All database tables exist with indexes
- [ ] Audit logging enabled

### UX (10-Minute Goal)
- [ ] Template selector on home page
- [ ] Quick Grid creates layout in < 1 minute
- [ ] CSV name suggestions reduce errors
- [ ] Template downloads available
- [ ] Easy Mode simplifies designer

### Data
- [ ] Excel files supported
- [ ] CSV export works
- [ ] Large uploads optimized
- [ ] Pagination on lists

### Performance
- [ ] Database indexes in place
- [ ] N+1 queries fixed
- [ ] Frontend builds without warnings

---

## Estimated Implementation Time

| Phase | Focus | Hours |
|-------|-------|-------|
| Phase 1 | Security Fixes | 8 |
| Phase 2 | UX Quick Wins | 12 |
| Phase 3 | Data Pipeline | 8 |
| Phase 4 | Production Hardening | 8 |
| **Total** | | **36 hours** |

---

## Post-Implementation: Update CLAUDE.md

After all phases complete, update CLAUDE.md to document:
1. New middleware (validation, audit)
2. New tables (locations, items, item_pick_transactions, route_markers)
3. New features (templates, Excel import, export)
4. Pagination query parameters
5. Easy Mode in designer
