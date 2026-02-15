# Engineered Labor Standards Builder - Technical Implementation Specification

> **Document Purpose:** This is a detailed coding specification for an AI coding agent to implement the Engineered Labor Standards Builder feature in the HeatmapSlotting application.
> 
> **Codebase Context:** The application uses Next.js 14 (frontend), Express.js (backend), PostgreSQL (Supabase), and react-konva for canvas rendering. Review `CLAUDE.md` in the project root for architecture details.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [Backend API Routes](#3-backend-api-routes)
4. [Frontend Types](#4-frontend-types)
5. [Frontend API Client](#5-frontend-api-client)
6. [UI Components](#6-ui-components)
7. [Page Implementation](#7-page-implementation)
8. [Integration with Existing Features](#8-integration-with-existing-features)
9. [Seed Data](#9-seed-data)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Overview

### 1.1 Feature Summary

The Engineered Labor Standards Builder allows warehouse operations managers to:
1. **Build process templates** using drag-and-drop time elements (like building a playlist)
2. **Upload pick data** (CSV) and apply templates to estimate batch completion times
3. **Integrate with existing heatmap** for automatic travel time calculation

### 1.2 New Files to Create

```
backend/
├── routes/
│   ├── laborElements.js      # Time elements CRUD
│   ├── laborTemplates.js     # Process templates CRUD
│   └── laborEstimates.js     # Batch estimation engine
├── middleware/
│   └── validateLabor.js      # Input validation for labor endpoints
└── db/migrations/
    └── 007_labor_standards.sql

frontend/
├── app/
│   └── labor/
│       └── page.tsx          # Main labor standards page
├── components/
│   └── labor/
│       ├── ElementLibrary.tsx
│       ├── ElementCard.tsx
│       ├── ProcessDesigner.tsx
│       ├── TimelineItem.tsx
│       ├── ElementConfigModal.tsx
│       ├── TemplateManager.tsx
│       ├── BatchEstimator.tsx
│       ├── EstimateResults.tsx
│       ├── RunningTotals.tsx
│       └── ColumnMapper.tsx
└── lib/
    ├── laborTypes.ts         # TypeScript interfaces
    ├── laborApi.ts           # API client for labor endpoints
    ├── laborCalculations.ts  # Time calculation utilities
    └── laborElementsData.ts  # Seed data for system elements
```

### 1.3 Existing Files to Modify

```
frontend/lib/types.ts         # Add labor-related types (or import from laborTypes.ts)
frontend/lib/api.ts           # Add labor API exports (or keep separate in laborApi.ts)
frontend/components/Header.tsx # Add navigation link to Labor Standards
backend/server.js             # Register new routes
```

---

## 2. Database Schema

### 2.1 Migration File

**File:** `backend/db/migrations/007_labor_standards.sql`

```sql
-- Migration 007: Engineered Labor Standards Builder
-- Adds tables for time elements, process templates, and batch estimates

-- =============================================================================
-- TIME_ELEMENTS TABLE
-- Stores both system (pre-built) and custom (user-created) time elements
-- =============================================================================

CREATE TABLE IF NOT EXISTS time_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,  -- NULL for system elements
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    base_time_seconds DECIMAL(8,4) NOT NULL,
    time_unit VARCHAR(20) NOT NULL DEFAULT 'fixed',  -- 'fixed', 'per_foot', 'per_unit', 'per_rung', 'per_step'
    description TEXT,
    icon VARCHAR(10),  -- Emoji or symbol for UI
    variables JSONB DEFAULT '{}',  -- { "distance": true, "qty": true, "rungs": true }
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_hidden BOOLEAN NOT NULL DEFAULT false,  -- User can hide elements from their library
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- System elements have no user_id, custom elements require user_id
    CONSTRAINT valid_element_ownership CHECK (
        (is_system = true AND user_id IS NULL) OR
        (is_system = false AND user_id IS NOT NULL)
    ),
    -- Code must be unique per user (or globally for system elements)
    CONSTRAINT unique_element_code UNIQUE (user_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_elements_user ON time_elements(user_id);
CREATE INDEX IF NOT EXISTS idx_time_elements_category ON time_elements(category);
CREATE INDEX IF NOT EXISTS idx_time_elements_system ON time_elements(is_system);

COMMENT ON TABLE time_elements IS 'Library of time elements for building labor standards';
COMMENT ON COLUMN time_elements.time_unit IS 'How time is calculated: fixed, per_foot, per_unit, per_rung, per_step';
COMMENT ON COLUMN time_elements.variables IS 'JSON object indicating which variables this element requires';

-- =============================================================================
-- PROCESS_TEMPLATES TABLE
-- Stores saved process templates (picking workflows)
-- =============================================================================

CREATE TABLE IF NOT EXISTS process_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL,  -- Optional: template can be layout-specific
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),  -- 'piece_picking', 'case_picking', 'batch_picking', etc.
    description TEXT,
    item_type VARCHAR(20),  -- 'each', 'case', 'both'
    slot_levels TEXT[],  -- ARRAY['Floor', 'Knee', 'Waist', 'Shoulder', 'Overhead']
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_process_templates_user ON process_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_process_templates_layout ON process_templates(layout_id);
CREATE INDEX IF NOT EXISTS idx_process_templates_category ON process_templates(category);

-- Ensure only one default template per category per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_default_template 
    ON process_templates(user_id, category) 
    WHERE is_default = true;

COMMENT ON TABLE process_templates IS 'Saved picking process workflows built from time elements';

-- =============================================================================
-- TEMPLATE_ELEMENTS TABLE
-- Junction table: elements in a template (the "playlist")
-- =============================================================================

CREATE TABLE IF NOT EXISTS template_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES process_templates(id) ON DELETE CASCADE,
    element_id UUID NOT NULL REFERENCES time_elements(id) ON DELETE RESTRICT,
    sequence_order INTEGER NOT NULL,
    is_conditional BOOLEAN NOT NULL DEFAULT false,
    conditions JSONB DEFAULT '{}',  -- { "slot_level": "Floor", "item_weight": "Heavy" }
    variable_values JSONB DEFAULT '{}',  -- { "distance": "auto_heatmap", "rungs": 3 }
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique sequence order within a template
    CONSTRAINT unique_sequence_per_template UNIQUE (template_id, sequence_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_elements_template ON template_elements(template_id);
CREATE INDEX IF NOT EXISTS idx_template_elements_element ON template_elements(element_id);

COMMENT ON TABLE template_elements IS 'Elements within a process template, ordered as a timeline';
COMMENT ON COLUMN template_elements.conditions IS 'When this element applies (e.g., only for floor-level picks)';
COMMENT ON COLUMN template_elements.variable_values IS 'Configured values for variable elements (distance, qty, etc.)';

-- =============================================================================
-- BATCH_ESTIMATES TABLE
-- Stores saved estimation runs
-- =============================================================================

CREATE TABLE IF NOT EXISTS batch_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL,
    name VARCHAR(200),
    source_file_name VARCHAR(255),
    total_picks INTEGER NOT NULL DEFAULT 0,
    total_time_seconds DECIMAL(12,2) NOT NULL DEFAULT 0,
    avg_time_per_pick DECIMAL(8,4),
    picks_per_hour DECIMAL(8,2),
    time_breakdown JSONB DEFAULT '{}',  -- { "travel": 0.55, "pick": 0.31, "confirm": 0.08, "body": 0.06 }
    settings JSONB DEFAULT '{}',  -- Templates used, PF&D allowance, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batch_estimates_user ON batch_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_estimates_layout ON batch_estimates(layout_id);
CREATE INDEX IF NOT EXISTS idx_batch_estimates_created ON batch_estimates(created_at DESC);

COMMENT ON TABLE batch_estimates IS 'Saved batch time estimation results';

-- =============================================================================
-- BATCH_ESTIMATE_PICKS TABLE
-- Detailed per-pick calculations from an estimate run
-- =============================================================================

CREATE TABLE IF NOT EXISTS batch_estimate_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES batch_estimates(id) ON DELETE CASCADE,
    pick_id VARCHAR(100),  -- External pick ID from uploaded CSV
    batch_id VARCHAR(100),
    wave_id VARCHAR(100),
    slot_location VARCHAR(50),
    sku VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    item_type VARCHAR(20),  -- 'each', 'case'
    slot_level VARCHAR(30),  -- 'Floor', 'Knee', 'Waist', 'Shoulder', 'Overhead'
    item_weight VARCHAR(30),  -- 'Light', 'Medium', 'Heavy', 'Team'
    travel_distance_feet DECIMAL(10,2),
    travel_time_seconds DECIMAL(8,4),
    pick_time_seconds DECIMAL(8,4),
    total_time_seconds DECIMAL(8,4),
    template_id UUID REFERENCES process_templates(id) ON DELETE SET NULL,
    calculation_details JSONB DEFAULT '{}'  -- Breakdown of each element applied
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimate_picks_estimate ON batch_estimate_picks(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_picks_batch ON batch_estimate_picks(estimate_id, batch_id);

COMMENT ON TABLE batch_estimate_picks IS 'Per-pick calculation details from batch estimates';

-- =============================================================================
-- LABOR_SETTINGS TABLE
-- User-specific settings for the labor module
-- =============================================================================

CREATE TABLE IF NOT EXISTS labor_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    walk_speed_sec_per_foot DECIMAL(6,4) NOT NULL DEFAULT 0.035,
    default_pfd_allowance DECIMAL(4,2) NOT NULL DEFAULT 0.15,  -- 15%
    labor_cost_per_hour DECIMAL(8,2) NOT NULL DEFAULT 20.00,
    travel_threshold_warning DECIMAL(4,2) NOT NULL DEFAULT 0.55,  -- Warn if travel > 55%
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE labor_settings IS 'User-specific settings for labor time calculations';

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE time_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_estimate_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_settings ENABLE ROW LEVEL SECURITY;

-- Time Elements: Users can see system elements + their own custom elements
CREATE POLICY "Users can view system and own elements" ON time_elements
    FOR SELECT USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own elements" ON time_elements
    FOR INSERT WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update own elements" ON time_elements
    FOR UPDATE USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can delete own elements" ON time_elements
    FOR DELETE USING (user_id = auth.uid() AND is_system = false);

-- Process Templates: Users can only access their own templates
CREATE POLICY "Users can view own templates" ON process_templates
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own templates" ON process_templates
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates" ON process_templates
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own templates" ON process_templates
    FOR DELETE USING (user_id = auth.uid());

-- Template Elements: Access through template ownership
CREATE POLICY "Users can view elements of own templates" ON template_elements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM process_templates
            WHERE process_templates.id = template_elements.template_id
            AND process_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert elements to own templates" ON template_elements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM process_templates
            WHERE process_templates.id = template_elements.template_id
            AND process_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update elements in own templates" ON template_elements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM process_templates
            WHERE process_templates.id = template_elements.template_id
            AND process_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete elements from own templates" ON template_elements
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM process_templates
            WHERE process_templates.id = template_elements.template_id
            AND process_templates.user_id = auth.uid()
        )
    );

-- Batch Estimates: Users can only access their own estimates
CREATE POLICY "Users can view own estimates" ON batch_estimates
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own estimates" ON batch_estimates
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own estimates" ON batch_estimates
    FOR DELETE USING (user_id = auth.uid());

-- Estimate Picks: Access through estimate ownership
CREATE POLICY "Users can view picks of own estimates" ON batch_estimate_picks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM batch_estimates
            WHERE batch_estimates.id = batch_estimate_picks.estimate_id
            AND batch_estimates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert picks to own estimates" ON batch_estimate_picks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM batch_estimates
            WHERE batch_estimates.id = batch_estimate_picks.estimate_id
            AND batch_estimates.user_id = auth.uid()
        )
    );

-- Labor Settings: Users can only access their own settings
CREATE POLICY "Users can view own labor settings" ON labor_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own labor settings" ON labor_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own labor settings" ON labor_settings
    FOR UPDATE USING (user_id = auth.uid());
```

### 2.2 Run Migration

Run the SQL in Supabase SQL Editor, then verify:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%labor%' OR table_name LIKE '%time_elements%' OR table_name LIKE '%template%' OR table_name LIKE '%batch_estimate%';
```

Expected: `time_elements`, `process_templates`, `template_elements`, `batch_estimates`, `batch_estimate_picks`, `labor_settings`

---

## 3. Backend API Routes

### 3.1 Validation Middleware

**File:** `backend/middleware/validateLabor.js`

```javascript
// backend/middleware/validateLabor.js

const validateTimeElement = (req, res, next) => {
  const { code, name, category, base_time_seconds, time_unit } = req.body;

  // Required fields
  if (!code || typeof code !== 'string' || code.length > 30) {
    return res.status(400).json({ error: 'code is required and must be 30 characters or less' });
  }
  if (!name || typeof name !== 'string' || name.length > 100) {
    return res.status(400).json({ error: 'name is required and must be 100 characters or less' });
  }
  if (!category || typeof category !== 'string' || category.length > 50) {
    return res.status(400).json({ error: 'category is required and must be 50 characters or less' });
  }
  if (typeof base_time_seconds !== 'number' || base_time_seconds < 0 || base_time_seconds > 9999) {
    return res.status(400).json({ error: 'base_time_seconds must be a number between 0 and 9999' });
  }

  // Time unit validation
  const validUnits = ['fixed', 'per_foot', 'per_unit', 'per_rung', 'per_step'];
  if (time_unit && !validUnits.includes(time_unit)) {
    return res.status(400).json({ error: `time_unit must be one of: ${validUnits.join(', ')}` });
  }

  next();
};

const validateProcessTemplate = (req, res, next) => {
  const { name, category, item_type, slot_levels } = req.body;

  if (!name || typeof name !== 'string' || name.length > 200) {
    return res.status(400).json({ error: 'name is required and must be 200 characters or less' });
  }

  const validCategories = ['piece_picking', 'case_picking', 'batch_picking', 'pallet_picking', 'custom'];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
  }

  const validItemTypes = ['each', 'case', 'both'];
  if (item_type && !validItemTypes.includes(item_type)) {
    return res.status(400).json({ error: `item_type must be one of: ${validItemTypes.join(', ')}` });
  }

  const validSlotLevels = ['Floor', 'Knee', 'Waist', 'Shoulder', 'Overhead'];
  if (slot_levels && Array.isArray(slot_levels)) {
    for (const level of slot_levels) {
      if (!validSlotLevels.includes(level)) {
        return res.status(400).json({ error: `slot_levels must only contain: ${validSlotLevels.join(', ')}` });
      }
    }
  }

  next();
};

const validateTemplateElement = (req, res, next) => {
  const { element_id, sequence_order, is_conditional, conditions, variable_values } = req.body;

  if (!element_id) {
    return res.status(400).json({ error: 'element_id is required' });
  }

  if (typeof sequence_order !== 'number' || sequence_order < 0 || sequence_order > 100) {
    return res.status(400).json({ error: 'sequence_order must be a number between 0 and 100' });
  }

  if (is_conditional !== undefined && typeof is_conditional !== 'boolean') {
    return res.status(400).json({ error: 'is_conditional must be a boolean' });
  }

  if (conditions !== undefined && typeof conditions !== 'object') {
    return res.status(400).json({ error: 'conditions must be an object' });
  }

  if (variable_values !== undefined && typeof variable_values !== 'object') {
    return res.status(400).json({ error: 'variable_values must be an object' });
  }

  next();
};

const validateLaborSettings = (req, res, next) => {
  const { walk_speed_sec_per_foot, default_pfd_allowance, labor_cost_per_hour, travel_threshold_warning } = req.body;

  if (walk_speed_sec_per_foot !== undefined) {
    if (typeof walk_speed_sec_per_foot !== 'number' || walk_speed_sec_per_foot < 0.01 || walk_speed_sec_per_foot > 1) {
      return res.status(400).json({ error: 'walk_speed_sec_per_foot must be between 0.01 and 1' });
    }
  }

  if (default_pfd_allowance !== undefined) {
    if (typeof default_pfd_allowance !== 'number' || default_pfd_allowance < 0 || default_pfd_allowance > 0.5) {
      return res.status(400).json({ error: 'default_pfd_allowance must be between 0 and 0.5 (0-50%)' });
    }
  }

  if (labor_cost_per_hour !== undefined) {
    if (typeof labor_cost_per_hour !== 'number' || labor_cost_per_hour < 0 || labor_cost_per_hour > 1000) {
      return res.status(400).json({ error: 'labor_cost_per_hour must be between 0 and 1000' });
    }
  }

  if (travel_threshold_warning !== undefined) {
    if (typeof travel_threshold_warning !== 'number' || travel_threshold_warning < 0 || travel_threshold_warning > 1) {
      return res.status(400).json({ error: 'travel_threshold_warning must be between 0 and 1' });
    }
  }

  next();
};

module.exports = {
  validateTimeElement,
  validateProcessTemplate,
  validateTemplateElement,
  validateLaborSettings,
};
```

### 3.2 Time Elements Route

**File:** `backend/routes/laborElements.js`

```javascript
// backend/routes/laborElements.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateTimeElement } = require('../middleware/validateLabor');
const { query } = require('../db');

// GET /api/labor/elements - Get all elements (system + user's custom)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, include_hidden } = req.query;

    let sql = `
      SELECT * FROM time_elements
      WHERE (is_system = true OR user_id = $1)
    `;
    const params = [userId];
    let paramIndex = 2;

    // Filter by category if provided
    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Exclude hidden unless requested
    if (include_hidden !== 'true') {
      sql += ` AND (is_hidden = false OR user_id IS NULL)`; // System elements are never hidden
    }

    sql += ` ORDER BY is_system DESC, category ASC, name ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/labor/elements/:id - Get a single element
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM time_elements
       WHERE id = $1 AND (is_system = true OR user_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/labor/elements - Create a custom element
router.post('/', authMiddleware, validateTimeElement, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { code, name, category, base_time_seconds, time_unit, description, icon, variables } = req.body;

    const result = await query(
      `INSERT INTO time_elements 
       (user_id, code, name, category, base_time_seconds, time_unit, description, icon, variables, is_system)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
       RETURNING *`,
      [userId, code, name, category, base_time_seconds, time_unit || 'fixed', description, icon, variables || {}]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An element with this code already exists' });
    }
    next(error);
  }
});

// PUT /api/labor/elements/:id - Update a custom element
router.put('/:id', authMiddleware, validateTimeElement, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { code, name, category, base_time_seconds, time_unit, description, icon, variables } = req.body;

    // Verify element belongs to user and is not a system element
    const checkResult = await query(
      `SELECT id, is_system FROM time_elements WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    if (checkResult.rows[0].is_system) {
      return res.status(403).json({ error: 'Cannot modify system elements' });
    }

    const result = await query(
      `UPDATE time_elements
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           category = COALESCE($3, category),
           base_time_seconds = COALESCE($4, base_time_seconds),
           time_unit = COALESCE($5, time_unit),
           description = COALESCE($6, description),
           icon = COALESCE($7, icon),
           variables = COALESCE($8, variables),
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [code, name, category, base_time_seconds, time_unit, description, icon, variables, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found or not owned by user' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/labor/elements/:id - Delete a custom element
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if element is in use by any templates
    const usageCheck = await query(
      `SELECT COUNT(*) FROM template_elements WHERE element_id = $1`,
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete element that is in use by templates. Remove from templates first.' 
      });
    }

    const result = await query(
      `DELETE FROM time_elements 
       WHERE id = $1 AND user_id = $2 AND is_system = false
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found or cannot be deleted' });
    }

    res.json({ message: 'Element deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/labor/elements/:id/hide - Toggle element visibility
router.patch('/:id/hide', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { is_hidden } = req.body;

    // For system elements, we store the hidden preference differently
    // For now, we only allow hiding custom elements
    const result = await query(
      `UPDATE time_elements
       SET is_hidden = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [is_hidden, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found or is a system element' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/labor/elements/categories - Get list of categories
router.get('/meta/categories', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT category FROM time_elements ORDER BY category`
    );
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 3.3 Process Templates Route

**File:** `backend/routes/laborTemplates.js`

```javascript
// backend/routes/laborTemplates.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateProcessTemplate, validateTemplateElement } = require('../middleware/validateLabor');
const { query } = require('../db');

// GET /api/labor/templates - Get all templates for user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, layout_id } = req.query;

    let sql = `
      SELECT 
        pt.*,
        COUNT(te.id) as element_count,
        SUM(CASE WHEN tim.time_unit = 'fixed' THEN tim.base_time_seconds ELSE 0 END) as base_time_seconds
      FROM process_templates pt
      LEFT JOIN template_elements te ON te.template_id = pt.id
      LEFT JOIN time_elements tim ON tim.id = te.element_id
      WHERE pt.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (category) {
      sql += ` AND pt.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (layout_id) {
      sql += ` AND (pt.layout_id = $${paramIndex} OR pt.layout_id IS NULL)`;
      params.push(layout_id);
      paramIndex++;
    }

    sql += ` GROUP BY pt.id ORDER BY pt.is_default DESC, pt.updated_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/labor/templates/:id - Get a single template with elements
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get template
    const templateResult = await query(
      `SELECT * FROM process_templates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Get elements with full details
    const elementsResult = await query(
      `SELECT 
        te.*,
        tim.code as element_code,
        tim.name as element_name,
        tim.category as element_category,
        tim.base_time_seconds,
        tim.time_unit,
        tim.icon,
        tim.variables as element_variables
      FROM template_elements te
      JOIN time_elements tim ON tim.id = te.element_id
      WHERE te.template_id = $1
      ORDER BY te.sequence_order ASC`,
      [id]
    );

    template.elements = elementsResult.rows;

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// POST /api/labor/templates - Create a new template
router.post('/', authMiddleware, validateProcessTemplate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, category, description, item_type, slot_levels, layout_id, is_default } = req.body;

    // If setting as default, unset other defaults in same category
    if (is_default && category) {
      await query(
        `UPDATE process_templates SET is_default = false 
         WHERE user_id = $1 AND category = $2`,
        [userId, category]
      );
    }

    const result = await query(
      `INSERT INTO process_templates 
       (user_id, name, category, description, item_type, slot_levels, layout_id, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, name, category, description, item_type, slot_levels, layout_id, is_default || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/labor/templates/:id - Update template properties
router.put('/:id', authMiddleware, validateProcessTemplate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, category, description, item_type, slot_levels, is_default } = req.body;

    // If setting as default, unset other defaults in same category
    if (is_default && category) {
      await query(
        `UPDATE process_templates SET is_default = false 
         WHERE user_id = $1 AND category = $2 AND id != $3`,
        [userId, category, id]
      );
    }

    const result = await query(
      `UPDATE process_templates
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           item_type = COALESCE($4, item_type),
           slot_levels = COALESCE($5, slot_levels),
           is_default = COALESCE($6, is_default),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, category, description, item_type, slot_levels, is_default, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/labor/templates/:id - Delete a template
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM process_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// POST /api/labor/templates/:id/clone - Clone a template
router.post('/:id/clone', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    // Get original template
    const originalResult = await query(
      `SELECT * FROM process_templates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const original = originalResult.rows[0];

    // Create new template
    const newTemplateResult = await query(
      `INSERT INTO process_templates 
       (user_id, name, category, description, item_type, slot_levels, layout_id, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING *`,
      [userId, name || `${original.name} (Copy)`, original.category, original.description, 
       original.item_type, original.slot_levels, original.layout_id]
    );

    const newTemplate = newTemplateResult.rows[0];

    // Copy all elements
    await query(
      `INSERT INTO template_elements (template_id, element_id, sequence_order, is_conditional, conditions, variable_values, notes)
       SELECT $1, element_id, sequence_order, is_conditional, conditions, variable_values, notes
       FROM template_elements
       WHERE template_id = $2`,
      [newTemplate.id, id]
    );

    res.status(201).json(newTemplate);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/labor/templates/:id/default - Set as default for category
router.patch('/:id/default', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get template category
    const templateResult = await query(
      `SELECT category FROM process_templates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const category = templateResult.rows[0].category;

    // Unset other defaults in same category
    await query(
      `UPDATE process_templates SET is_default = false 
       WHERE user_id = $1 AND category = $2`,
      [userId, category]
    );

    // Set this one as default
    const result = await query(
      `UPDATE process_templates SET is_default = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TEMPLATE ELEMENTS SUB-ROUTES
// ============================================================================

// POST /api/labor/templates/:id/elements - Add element to template
router.post('/:id/elements', authMiddleware, validateTemplateElement, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;
    const { element_id, sequence_order, is_conditional, conditions, variable_values, notes } = req.body;

    // Verify template ownership
    const templateCheck = await query(
      `SELECT id FROM process_templates WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Verify element exists and is accessible
    const elementCheck = await query(
      `SELECT id FROM time_elements WHERE id = $1 AND (is_system = true OR user_id = $2)`,
      [element_id, userId]
    );

    if (elementCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Element not found' });
    }

    const result = await query(
      `INSERT INTO template_elements 
       (template_id, element_id, sequence_order, is_conditional, conditions, variable_values, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [templateId, element_id, sequence_order, is_conditional || false, conditions || {}, variable_values || {}, notes]
    );

    // Update template timestamp
    await query(
      `UPDATE process_templates SET updated_at = NOW() WHERE id = $1`,
      [templateId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An element already exists at this sequence position' });
    }
    next(error);
  }
});

// PUT /api/labor/templates/:templateId/elements/:elementId - Update element in template
router.put('/:templateId/elements/:elementId', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId, elementId } = req.params;
    const { sequence_order, is_conditional, conditions, variable_values, notes } = req.body;

    // Verify template ownership
    const templateCheck = await query(
      `SELECT id FROM process_templates WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const result = await query(
      `UPDATE template_elements
       SET sequence_order = COALESCE($1, sequence_order),
           is_conditional = COALESCE($2, is_conditional),
           conditions = COALESCE($3, conditions),
           variable_values = COALESCE($4, variable_values),
           notes = COALESCE($5, notes)
       WHERE id = $6 AND template_id = $7
       RETURNING *`,
      [sequence_order, is_conditional, conditions, variable_values, notes, elementId, templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template element not found' });
    }

    // Update template timestamp
    await query(
      `UPDATE process_templates SET updated_at = NOW() WHERE id = $1`,
      [templateId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/labor/templates/:templateId/elements/:elementId - Remove element from template
router.delete('/:templateId/elements/:elementId', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { templateId, elementId } = req.params;

    // Verify template ownership
    const templateCheck = await query(
      `SELECT id FROM process_templates WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const result = await query(
      `DELETE FROM template_elements WHERE id = $1 AND template_id = $2 RETURNING id`,
      [elementId, templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template element not found' });
    }

    // Update template timestamp
    await query(
      `UPDATE process_templates SET updated_at = NOW() WHERE id = $1`,
      [templateId]
    );

    res.json({ message: 'Element removed from template', id: elementId });
  } catch (error) {
    next(error);
  }
});

// PUT /api/labor/templates/:id/elements/reorder - Reorder elements in template
router.put('/:id/elements/reorder', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;
    const { order } = req.body; // Array of { id: elementId, sequence_order: number }

    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array' });
    }

    // Verify template ownership
    const templateCheck = await query(
      `SELECT id FROM process_templates WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update each element's sequence order
    for (const item of order) {
      await query(
        `UPDATE template_elements 
         SET sequence_order = $1 
         WHERE id = $2 AND template_id = $3`,
        [item.sequence_order, item.id, templateId]
      );
    }

    // Update template timestamp
    await query(
      `UPDATE process_templates SET updated_at = NOW() WHERE id = $1`,
      [templateId]
    );

    res.json({ message: 'Elements reordered successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 3.4 Batch Estimates Route

**File:** `backend/routes/laborEstimates.js`

```javascript
// backend/routes/laborEstimates.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const authMiddleware = require('../middleware/auth');
const { validateLaborSettings } = require('../middleware/validateLabor');
const { query } = require('../db');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ============================================================================
// BATCH ESTIMATION
// ============================================================================

// POST /api/labor/estimate - Run batch estimation
router.post('/estimate', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      layout_id, 
      each_template_id, 
      case_template_id,
      column_mapping,
      pfd_allowance,
      name
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    // Parse CSV
    const picks = [];
    const mapping = JSON.parse(column_mapping || '{}');

    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file.buffer.toString());
      stream
        .pipe(csv())
        .on('data', (row) => {
          picks.push({
            pick_id: row[mapping.pick_id] || null,
            batch_id: row[mapping.batch_id] || null,
            wave_id: row[mapping.wave_id] || null,
            slot_location: row[mapping.slot_location] || null,
            sku: row[mapping.sku] || null,
            quantity: parseInt(row[mapping.quantity]) || 1,
            item_type: (row[mapping.item_type] || 'each').toLowerCase(),
            slot_level: row[mapping.slot_level] || null,
            item_weight: row[mapping.item_weight] || null,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (picks.length === 0) {
      return res.status(400).json({ error: 'No valid picks found in CSV' });
    }

    // Get user's labor settings
    const settingsResult = await query(
      `SELECT * FROM labor_settings WHERE user_id = $1`,
      [userId]
    );
    const settings = settingsResult.rows[0] || {
      walk_speed_sec_per_foot: 0.035,
      default_pfd_allowance: 0.15,
      labor_cost_per_hour: 20.00
    };

    const effectivePfdAllowance = pfd_allowance !== undefined 
      ? parseFloat(pfd_allowance) 
      : settings.default_pfd_allowance;

    // Get templates
    let eachTemplate = null;
    let caseTemplate = null;

    if (each_template_id) {
      const eachResult = await query(
        `SELECT pt.*, 
         json_agg(json_build_object(
           'id', te.id,
           'element_id', te.element_id,
           'sequence_order', te.sequence_order,
           'is_conditional', te.is_conditional,
           'conditions', te.conditions,
           'variable_values', te.variable_values,
           'base_time_seconds', tim.base_time_seconds,
           'time_unit', tim.time_unit,
           'category', tim.category
         ) ORDER BY te.sequence_order) as elements
         FROM process_templates pt
         LEFT JOIN template_elements te ON te.template_id = pt.id
         LEFT JOIN time_elements tim ON tim.id = te.element_id
         WHERE pt.id = $1 AND pt.user_id = $2
         GROUP BY pt.id`,
        [each_template_id, userId]
      );
      if (eachResult.rows.length > 0) {
        eachTemplate = eachResult.rows[0];
      }
    }

    if (case_template_id) {
      const caseResult = await query(
        `SELECT pt.*, 
         json_agg(json_build_object(
           'id', te.id,
           'element_id', te.element_id,
           'sequence_order', te.sequence_order,
           'is_conditional', te.is_conditional,
           'conditions', te.conditions,
           'variable_values', te.variable_values,
           'base_time_seconds', tim.base_time_seconds,
           'time_unit', tim.time_unit,
           'category', tim.category
         ) ORDER BY te.sequence_order) as elements
         FROM process_templates pt
         LEFT JOIN template_elements te ON te.template_id = pt.id
         LEFT JOIN time_elements tim ON tim.id = te.element_id
         WHERE pt.id = $1 AND pt.user_id = $2
         GROUP BY pt.id`,
        [case_template_id, userId]
      );
      if (caseResult.rows.length > 0) {
        caseTemplate = caseResult.rows[0];
      }
    }

    // Get warehouse elements for travel calculation if layout provided
    let warehouseElements = [];
    let cartParking = null;

    if (layout_id) {
      // Get warehouse elements with labels
      const elementsResult = await query(
        `SELECT id, label, x_coordinate, y_coordinate, width, height
         FROM warehouse_elements
         WHERE layout_id = $1`,
        [layout_id]
      );
      warehouseElements = elementsResult.rows;

      // Get cart parking location
      const parkingResult = await query(
        `SELECT x_coordinate, y_coordinate
         FROM route_markers
         WHERE layout_id = $1 AND marker_type = 'cart_parking'
         ORDER BY sequence_order ASC
         LIMIT 1`,
        [layout_id]
      );
      if (parkingResult.rows.length > 0) {
        cartParking = parkingResult.rows[0];
      }
    }

    // Calculate times for each pick
    const calculatedPicks = [];
    let totalTravelTime = 0;
    let totalPickTime = 0;
    let totalConfirmTime = 0;
    let totalBodyTime = 0;

    let previousLocation = cartParking;

    for (const pick of picks) {
      const template = pick.item_type === 'case' && caseTemplate ? caseTemplate : eachTemplate;
      
      let pickTravelTime = 0;
      let pickOperationTime = 0;
      const calculationDetails = [];

      // Find warehouse element for this slot
      const element = warehouseElements.find(e => 
        e.label && e.label.toLowerCase() === (pick.slot_location || '').toLowerCase()
      );

      // Calculate travel time
      if (element && previousLocation) {
        const distance = Math.sqrt(
          Math.pow(element.x_coordinate - previousLocation.x_coordinate, 2) +
          Math.pow(element.y_coordinate - previousLocation.y_coordinate, 2)
        );
        // Convert pixels to feet (1 pixel = 1 inch, 12 inches per foot)
        const distanceFeet = distance / 12;
        pickTravelTime = distanceFeet * settings.walk_speed_sec_per_foot;
        
        calculationDetails.push({
          element: 'Travel',
          time: pickTravelTime,
          distance_feet: distanceFeet
        });

        previousLocation = { x_coordinate: element.x_coordinate, y_coordinate: element.y_coordinate };
      }

      // Apply template elements
      if (template && template.elements) {
        for (const el of template.elements) {
          if (!el.element_id) continue;

          // Check conditional
          if (el.is_conditional && el.conditions) {
            const conditions = el.conditions;
            let applies = true;

            if (conditions.slot_level && pick.slot_level) {
              applies = applies && conditions.slot_level.toLowerCase() === pick.slot_level.toLowerCase();
            }
            if (conditions.item_weight && pick.item_weight) {
              applies = applies && conditions.item_weight.toLowerCase() === pick.item_weight.toLowerCase();
            }
            if (conditions.item_type) {
              applies = applies && conditions.item_type.toLowerCase() === pick.item_type.toLowerCase();
            }

            if (!applies) continue;
          }

          let elementTime = el.base_time_seconds || 0;

          // Handle variable elements
          if (el.time_unit === 'per_unit' && pick.quantity > 1) {
            elementTime = elementTime * pick.quantity;
          }

          pickOperationTime += elementTime;

          // Categorize time
          const category = el.category || 'other';
          if (category === 'travel') {
            totalTravelTime += elementTime;
          } else if (category === 'confirm' || category === 'confirmation') {
            totalConfirmTime += elementTime;
          } else if (category === 'body' || category === 'body_motion') {
            totalBodyTime += elementTime;
          } else {
            totalPickTime += elementTime;
          }

          calculationDetails.push({
            element: el.element_id,
            category,
            time: elementTime,
            conditional: el.is_conditional
          });
        }
      }

      totalTravelTime += pickTravelTime;

      calculatedPicks.push({
        ...pick,
        travel_distance_feet: element ? Math.sqrt(
          Math.pow(element.x_coordinate - (previousLocation?.x_coordinate || 0), 2) +
          Math.pow(element.y_coordinate - (previousLocation?.y_coordinate || 0), 2)
        ) / 12 : null,
        travel_time_seconds: pickTravelTime,
        pick_time_seconds: pickOperationTime,
        total_time_seconds: pickTravelTime + pickOperationTime,
        template_id: template?.id || null,
        calculation_details: calculationDetails
      });
    }

    // Calculate totals
    const totalTimeSeconds = calculatedPicks.reduce((sum, p) => sum + p.total_time_seconds, 0);
    const avgTimePerPick = totalTimeSeconds / calculatedPicks.length;
    const picksPerHour = 3600 / avgTimePerPick;

    // Apply PF&D allowance
    const adjustedTotalTime = totalTimeSeconds * (1 + effectivePfdAllowance);

    // Time breakdown percentages
    const totalOperationTime = totalTravelTime + totalPickTime + totalConfirmTime + totalBodyTime;
    const timeBreakdown = {
      travel: totalOperationTime > 0 ? totalTravelTime / totalOperationTime : 0,
      pick: totalOperationTime > 0 ? totalPickTime / totalOperationTime : 0,
      confirm: totalOperationTime > 0 ? totalConfirmTime / totalOperationTime : 0,
      body: totalOperationTime > 0 ? totalBodyTime / totalOperationTime : 0
    };

    // Save estimate to database
    const estimateResult = await query(
      `INSERT INTO batch_estimates 
       (user_id, layout_id, name, source_file_name, total_picks, total_time_seconds, 
        avg_time_per_pick, picks_per_hour, time_breakdown, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        layout_id || null,
        name || `Estimate ${new Date().toISOString().slice(0, 10)}`,
        req.file.originalname,
        calculatedPicks.length,
        adjustedTotalTime,
        avgTimePerPick * (1 + effectivePfdAllowance),
        3600 / (avgTimePerPick * (1 + effectivePfdAllowance)),
        timeBreakdown,
        { 
          each_template_id, 
          case_template_id, 
          pfd_allowance: effectivePfdAllowance,
          walk_speed: settings.walk_speed_sec_per_foot
        }
      ]
    );

    const estimate = estimateResult.rows[0];

    // Save individual pick calculations (batched for performance)
    const pickValues = calculatedPicks.map((p, i) => 
      `($1, $${i * 14 + 2}, $${i * 14 + 3}, $${i * 14 + 4}, $${i * 14 + 5}, $${i * 14 + 6}, $${i * 14 + 7}, $${i * 14 + 8}, $${i * 14 + 9}, $${i * 14 + 10}, $${i * 14 + 11}, $${i * 14 + 12}, $${i * 14 + 13}, $${i * 14 + 14}, $${i * 14 + 15})`
    ).join(', ');

    const pickParams = [estimate.id];
    calculatedPicks.forEach(p => {
      pickParams.push(
        p.pick_id, p.batch_id, p.wave_id, p.slot_location, p.sku,
        p.quantity, p.item_type, p.slot_level, p.item_weight,
        p.travel_distance_feet, p.travel_time_seconds, p.pick_time_seconds,
        p.total_time_seconds, p.template_id
      );
    });

    // Note: For large datasets, batch this into chunks of 100-500
    if (calculatedPicks.length <= 500) {
      await query(
        `INSERT INTO batch_estimate_picks 
         (estimate_id, pick_id, batch_id, wave_id, slot_location, sku, quantity, 
          item_type, slot_level, item_weight, travel_distance_feet, travel_time_seconds,
          pick_time_seconds, total_time_seconds, template_id)
         VALUES ${pickValues}`,
        pickParams
      );
    }

    // Group by batch for summary
    const batchSummary = {};
    for (const pick of calculatedPicks) {
      const batchId = pick.batch_id || 'unassigned';
      if (!batchSummary[batchId]) {
        batchSummary[batchId] = {
          batch_id: batchId,
          picks: 0,
          total_time: 0,
          travel_time: 0
        };
      }
      batchSummary[batchId].picks++;
      batchSummary[batchId].total_time += pick.total_time_seconds;
      batchSummary[batchId].travel_time += pick.travel_time_seconds;
    }

    const batches = Object.values(batchSummary).map(b => ({
      ...b,
      travel_percent: b.total_time > 0 ? b.travel_time / b.total_time : 0,
      picks_per_hour: 3600 / (b.total_time / b.picks),
      status: (b.travel_time / b.total_time) > settings.travel_threshold_warning ? 'high_travel' : 'normal'
    }));

    res.json({
      estimate,
      summary: {
        total_picks: calculatedPicks.length,
        total_time_seconds: adjustedTotalTime,
        total_time_formatted: formatTime(adjustedTotalTime),
        avg_time_per_pick: avgTimePerPick * (1 + effectivePfdAllowance),
        picks_per_hour: 3600 / (avgTimePerPick * (1 + effectivePfdAllowance)),
        time_breakdown: timeBreakdown,
        pfd_allowance: effectivePfdAllowance
      },
      batches,
      picks: calculatedPicks.slice(0, 100) // Return first 100 for preview
    });

  } catch (error) {
    console.error('Estimation error:', error);
    next(error);
  }
});

// Helper function to format time
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// GET /api/labor/estimates - Get all estimates for user
router.get('/estimates', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      query('SELECT COUNT(*) FROM batch_estimates WHERE user_id = $1', [userId]),
      query(
        `SELECT * FROM batch_estimates 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
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

// GET /api/labor/estimates/:id - Get estimate details
router.get('/estimates/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const estimateResult = await query(
      `SELECT * FROM batch_estimates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = estimateResult.rows[0];

    // Get picks
    const picksResult = await query(
      `SELECT * FROM batch_estimate_picks WHERE estimate_id = $1 ORDER BY batch_id, pick_id`,
      [id]
    );

    estimate.picks = picksResult.rows;

    res.json(estimate);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/labor/estimates/:id - Delete estimate
router.delete('/estimates/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM batch_estimates WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully', id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// LABOR SETTINGS
// ============================================================================

// GET /api/labor/settings - Get user's labor settings
router.get('/settings', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    let result = await query(
      `SELECT * FROM labor_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      result = await query(
        `INSERT INTO labor_settings (user_id) VALUES ($1) RETURNING *`,
        [userId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/labor/settings - Update labor settings
router.put('/settings', authMiddleware, validateLaborSettings, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { walk_speed_sec_per_foot, default_pfd_allowance, labor_cost_per_hour, travel_threshold_warning } = req.body;

    const result = await query(
      `INSERT INTO labor_settings (user_id, walk_speed_sec_per_foot, default_pfd_allowance, labor_cost_per_hour, travel_threshold_warning)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         walk_speed_sec_per_foot = COALESCE($2, labor_settings.walk_speed_sec_per_foot),
         default_pfd_allowance = COALESCE($3, labor_settings.default_pfd_allowance),
         labor_cost_per_hour = COALESCE($4, labor_settings.labor_cost_per_hour),
         travel_threshold_warning = COALESCE($5, labor_settings.travel_threshold_warning),
         updated_at = NOW()
       RETURNING *`,
      [userId, walk_speed_sec_per_foot, default_pfd_allowance, labor_cost_per_hour, travel_threshold_warning]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CALCULATE TRAVEL (for heatmap integration)
// ============================================================================

// POST /api/labor/calculate-travel - Calculate travel time between slots
router.post('/calculate-travel', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { layout_id, from_location, to_location } = req.body;

    if (!layout_id) {
      return res.status(400).json({ error: 'layout_id is required' });
    }

    // Get user settings
    const settingsResult = await query(
      `SELECT walk_speed_sec_per_foot FROM labor_settings WHERE user_id = $1`,
      [userId]
    );
    const walkSpeed = settingsResult.rows[0]?.walk_speed_sec_per_foot || 0.035;

    // Get locations
    let fromCoords = null;
    let toCoords = null;

    if (from_location) {
      const fromResult = await query(
        `SELECT x_coordinate, y_coordinate FROM warehouse_elements
         WHERE layout_id = $1 AND LOWER(label) = LOWER($2)`,
        [layout_id, from_location]
      );
      if (fromResult.rows.length > 0) {
        fromCoords = fromResult.rows[0];
      }
    } else {
      // Use cart parking as default start
      const parkingResult = await query(
        `SELECT x_coordinate, y_coordinate FROM route_markers
         WHERE layout_id = $1 AND marker_type = 'cart_parking'
         ORDER BY sequence_order ASC LIMIT 1`,
        [layout_id]
      );
      if (parkingResult.rows.length > 0) {
        fromCoords = parkingResult.rows[0];
      }
    }

    if (to_location) {
      const toResult = await query(
        `SELECT x_coordinate, y_coordinate FROM warehouse_elements
         WHERE layout_id = $1 AND LOWER(label) = LOWER($2)`,
        [layout_id, to_location]
      );
      if (toResult.rows.length > 0) {
        toCoords = toResult.rows[0];
      }
    }

    if (!fromCoords || !toCoords) {
      return res.status(404).json({ error: 'Could not find one or both locations' });
    }

    // Calculate distance (Euclidean for now, could use Manhattan)
    const distancePixels = Math.sqrt(
      Math.pow(toCoords.x_coordinate - fromCoords.x_coordinate, 2) +
      Math.pow(toCoords.y_coordinate - fromCoords.y_coordinate, 2)
    );
    
    // Convert pixels to feet (1 pixel = 1 inch)
    const distanceFeet = distancePixels / 12;
    const travelTimeSeconds = distanceFeet * walkSpeed;

    res.json({
      from_location,
      to_location,
      distance_pixels: distancePixels,
      distance_feet: distanceFeet,
      travel_time_seconds: travelTimeSeconds,
      walk_speed_used: walkSpeed
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### 3.5 Register Routes in Server

**File:** `backend/server.js`

Add the following to register the new routes:

```javascript
// Add these imports near the top with other route imports
const laborElementsRoutes = require('./routes/laborElements');
const laborTemplatesRoutes = require('./routes/laborTemplates');
const laborEstimatesRoutes = require('./routes/laborEstimates');

// Add these route registrations with the other routes
app.use('/api/labor/elements', laborElementsRoutes);
app.use('/api/labor/templates', laborTemplatesRoutes);
app.use('/api/labor', laborEstimatesRoutes); // Handles /estimate, /estimates, /settings, /calculate-travel
```

---

## 4. Frontend Types

**File:** `frontend/lib/laborTypes.ts`

```typescript
// frontend/lib/laborTypes.ts

// =============================================================================
// TIME ELEMENTS
// =============================================================================

export type TimeUnit = 'fixed' | 'per_foot' | 'per_unit' | 'per_rung' | 'per_step';

export type ElementCategory = 
  | 'travel' 
  | 'body_motion' 
  | 'pick_each' 
  | 'pick_case' 
  | 'confirmation' 
  | 'access_equipment' 
  | 'transport';

export interface TimeElement {
  id: string;
  user_id: string | null;
  code: string;
  name: string;
  category: ElementCategory;
  base_time_seconds: number;
  time_unit: TimeUnit;
  description?: string;
  icon?: string;
  variables: Record<string, boolean>;  // { distance: true, qty: true }
  is_system: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeElementRequest {
  code: string;
  name: string;
  category: ElementCategory;
  base_time_seconds: number;
  time_unit?: TimeUnit;
  description?: string;
  icon?: string;
  variables?: Record<string, boolean>;
}

// =============================================================================
// PROCESS TEMPLATES
// =============================================================================

export type TemplateCategory = 
  | 'piece_picking' 
  | 'case_picking' 
  | 'batch_picking' 
  | 'pallet_picking' 
  | 'custom';

export type ItemType = 'each' | 'case' | 'both';

export type SlotLevel = 'Floor' | 'Knee' | 'Waist' | 'Shoulder' | 'Overhead';

export interface ProcessTemplate {
  id: string;
  user_id: string;
  layout_id?: string;
  name: string;
  category?: TemplateCategory;
  description?: string;
  item_type?: ItemType;
  slot_levels?: SlotLevel[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
  element_count?: number;
  base_time_seconds?: number;
  elements?: TemplateElement[];
}

export interface CreateTemplateRequest {
  name: string;
  category?: TemplateCategory;
  description?: string;
  item_type?: ItemType;
  slot_levels?: SlotLevel[];
  layout_id?: string;
  is_default?: boolean;
}

export interface TemplateElement {
  id: string;
  template_id: string;
  element_id: string;
  sequence_order: number;
  is_conditional: boolean;
  conditions: ConditionConfig;
  variable_values: VariableValues;
  notes?: string;
  created_at: string;
  // Joined fields from time_elements
  element_code?: string;
  element_name?: string;
  element_category?: ElementCategory;
  base_time_seconds?: number;
  time_unit?: TimeUnit;
  icon?: string;
  element_variables?: Record<string, boolean>;
}

export interface ConditionConfig {
  slot_level?: SlotLevel;
  item_weight?: 'Light' | 'Medium' | 'Heavy' | 'Team';
  item_type?: 'each' | 'case';
}

export interface VariableValues {
  distance?: number | 'auto_heatmap';
  qty?: number;
  rungs?: number;
  steps?: number;
}

export interface CreateTemplateElementRequest {
  element_id: string;
  sequence_order: number;
  is_conditional?: boolean;
  conditions?: ConditionConfig;
  variable_values?: VariableValues;
  notes?: string;
}

// =============================================================================
// BATCH ESTIMATES
// =============================================================================

export interface BatchEstimate {
  id: string;
  user_id: string;
  layout_id?: string;
  name?: string;
  source_file_name?: string;
  total_picks: number;
  total_time_seconds: number;
  avg_time_per_pick?: number;
  picks_per_hour?: number;
  time_breakdown: TimeBreakdown;
  settings: EstimateSettings;
  created_at: string;
  picks?: EstimatePick[];
}

export interface TimeBreakdown {
  travel: number;  // Percentage (0-1)
  pick: number;
  confirm: number;
  body: number;
}

export interface EstimateSettings {
  each_template_id?: string;
  case_template_id?: string;
  pfd_allowance: number;
  walk_speed: number;
}

export interface EstimatePick {
  id: string;
  estimate_id: string;
  pick_id?: string;
  batch_id?: string;
  wave_id?: string;
  slot_location?: string;
  sku?: string;
  quantity: number;
  item_type?: string;
  slot_level?: string;
  item_weight?: string;
  travel_distance_feet?: number;
  travel_time_seconds?: number;
  pick_time_seconds?: number;
  total_time_seconds?: number;
  template_id?: string;
  calculation_details?: any;
}

export interface EstimateResult {
  estimate: BatchEstimate;
  summary: EstimateSummary;
  batches: BatchSummary[];
  picks: EstimatePick[];
}

export interface EstimateSummary {
  total_picks: number;
  total_time_seconds: number;
  total_time_formatted: string;
  avg_time_per_pick: number;
  picks_per_hour: number;
  time_breakdown: TimeBreakdown;
  pfd_allowance: number;
}

export interface BatchSummary {
  batch_id: string;
  picks: number;
  total_time: number;
  travel_time: number;
  travel_percent: number;
  picks_per_hour: number;
  status: 'normal' | 'high_travel';
}

// =============================================================================
// LABOR SETTINGS
// =============================================================================

export interface LaborSettings {
  id: string;
  user_id: string;
  walk_speed_sec_per_foot: number;
  default_pfd_allowance: number;
  labor_cost_per_hour: number;
  travel_threshold_warning: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// COLUMN MAPPING (for CSV upload)
// =============================================================================

export interface ColumnMapping {
  pick_id?: string;
  batch_id?: string;
  wave_id?: string;
  slot_location?: string;
  sku?: string;
  quantity?: string;
  item_type?: string;
  slot_level?: string;
  item_weight?: string;
}

// =============================================================================
// ELEMENT CATEGORIES CONFIG
// =============================================================================

export const ELEMENT_CATEGORY_CONFIG: Record<ElementCategory, { 
  name: string; 
  color: string; 
  description: string;
}> = {
  travel: {
    name: 'Travel',
    color: '#8b5cf6',
    description: 'Walking and movement'
  },
  body_motion: {
    name: 'Body Motion',
    color: '#f59e0b',
    description: 'Bending, reaching, kneeling'
  },
  pick_each: {
    name: 'Picking - Each',
    color: '#22c55e',
    description: 'Piece/each picking operations'
  },
  pick_case: {
    name: 'Picking - Case',
    color: '#06b6d4',
    description: 'Case picking operations'
  },
  confirmation: {
    name: 'Confirmation',
    color: '#3b82f6',
    description: 'RF scan, voice, pick-to-light'
  },
  access_equipment: {
    name: 'Access Equipment',
    color: '#ec4899',
    description: 'Ladders, step stools, order pickers'
  },
  transport: {
    name: 'Transport',
    color: '#f97316',
    description: 'Carts, pallet jacks, forklifts'
  }
};
```

---

## 5. Frontend API Client

**File:** `frontend/lib/laborApi.ts`

```typescript
// frontend/lib/laborApi.ts

import { supabase } from './supabase';
import type {
  TimeElement,
  CreateTimeElementRequest,
  ProcessTemplate,
  CreateTemplateRequest,
  TemplateElement,
  CreateTemplateElementRequest,
  BatchEstimate,
  EstimateResult,
  LaborSettings,
  ColumnMapping,
} from './laborTypes';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generic fetch wrapper with auth
async function laborApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// TIME ELEMENTS API
// =============================================================================

export const laborElementsApi = {
  // Get all elements (system + custom)
  getAll: (category?: string, includeHidden?: boolean): Promise<TimeElement[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (includeHidden) params.append('include_hidden', 'true');
    const query = params.toString();
    return laborApiFetch<TimeElement[]>(`/api/labor/elements${query ? `?${query}` : ''}`);
  },

  // Get a single element
  get: (id: string): Promise<TimeElement> =>
    laborApiFetch<TimeElement>(`/api/labor/elements/${id}`),

  // Create custom element
  create: (data: CreateTimeElementRequest): Promise<TimeElement> =>
    laborApiFetch<TimeElement>('/api/labor/elements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update custom element
  update: (id: string, data: Partial<CreateTimeElementRequest>): Promise<TimeElement> =>
    laborApiFetch<TimeElement>(`/api/labor/elements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete custom element
  delete: (id: string): Promise<{ message: string; id: string }> =>
    laborApiFetch<{ message: string; id: string }>(`/api/labor/elements/${id}`, {
      method: 'DELETE',
    }),

  // Toggle hidden
  toggleHidden: (id: string, isHidden: boolean): Promise<TimeElement> =>
    laborApiFetch<TimeElement>(`/api/labor/elements/${id}/hide`, {
      method: 'PATCH',
      body: JSON.stringify({ is_hidden: isHidden }),
    }),

  // Get categories
  getCategories: (): Promise<string[]> =>
    laborApiFetch<string[]>('/api/labor/elements/meta/categories'),
};

// =============================================================================
// PROCESS TEMPLATES API
// =============================================================================

export const laborTemplatesApi = {
  // Get all templates
  getAll: (category?: string, layoutId?: string): Promise<ProcessTemplate[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (layoutId) params.append('layout_id', layoutId);
    const query = params.toString();
    return laborApiFetch<ProcessTemplate[]>(`/api/labor/templates${query ? `?${query}` : ''}`);
  },

  // Get template with elements
  get: (id: string): Promise<ProcessTemplate> =>
    laborApiFetch<ProcessTemplate>(`/api/labor/templates/${id}`),

  // Create template
  create: (data: CreateTemplateRequest): Promise<ProcessTemplate> =>
    laborApiFetch<ProcessTemplate>('/api/labor/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update template
  update: (id: string, data: Partial<CreateTemplateRequest>): Promise<ProcessTemplate> =>
    laborApiFetch<ProcessTemplate>(`/api/labor/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete template
  delete: (id: string): Promise<{ message: string; id: string }> =>
    laborApiFetch<{ message: string; id: string }>(`/api/labor/templates/${id}`, {
      method: 'DELETE',
    }),

  // Clone template
  clone: (id: string, name?: string): Promise<ProcessTemplate> =>
    laborApiFetch<ProcessTemplate>(`/api/labor/templates/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  // Set as default
  setDefault: (id: string): Promise<ProcessTemplate> =>
    laborApiFetch<ProcessTemplate>(`/api/labor/templates/${id}/default`, {
      method: 'PATCH',
    }),

  // Add element to template
  addElement: (templateId: string, data: CreateTemplateElementRequest): Promise<TemplateElement> =>
    laborApiFetch<TemplateElement>(`/api/labor/templates/${templateId}/elements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update element in template
  updateElement: (templateId: string, elementId: string, data: Partial<CreateTemplateElementRequest>): Promise<TemplateElement> =>
    laborApiFetch<TemplateElement>(`/api/labor/templates/${templateId}/elements/${elementId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Remove element from template
  removeElement: (templateId: string, elementId: string): Promise<{ message: string; id: string }> =>
    laborApiFetch<{ message: string; id: string }>(`/api/labor/templates/${templateId}/elements/${elementId}`, {
      method: 'DELETE',
    }),

  // Reorder elements
  reorderElements: (templateId: string, order: Array<{ id: string; sequence_order: number }>): Promise<{ message: string }> =>
    laborApiFetch<{ message: string }>(`/api/labor/templates/${templateId}/elements/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    }),
};

// =============================================================================
// BATCH ESTIMATES API
// =============================================================================

export const laborEstimatesApi = {
  // Run estimation
  estimate: async (
    file: File,
    options: {
      layout_id?: string;
      each_template_id?: string;
      case_template_id?: string;
      column_mapping: ColumnMapping;
      pfd_allowance?: number;
      name?: string;
    }
  ): Promise<EstimateResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const formData = new FormData();
    formData.append('file', file);
    if (options.layout_id) formData.append('layout_id', options.layout_id);
    if (options.each_template_id) formData.append('each_template_id', options.each_template_id);
    if (options.case_template_id) formData.append('case_template_id', options.case_template_id);
    formData.append('column_mapping', JSON.stringify(options.column_mapping));
    if (options.pfd_allowance !== undefined) formData.append('pfd_allowance', options.pfd_allowance.toString());
    if (options.name) formData.append('name', options.name);

    const response = await fetch(`${API_URL}/api/labor/estimate`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Estimation failed' }));
      throw new Error(error.error);
    }

    return response.json();
  },

  // Get all estimates
  getAll: (page = 1, limit = 20): Promise<{ data: BatchEstimate[]; pagination: { page: number; limit: number; total: number; pages: number } }> =>
    laborApiFetch(`/api/labor/estimates?page=${page}&limit=${limit}`),

  // Get estimate details
  get: (id: string): Promise<BatchEstimate> =>
    laborApiFetch<BatchEstimate>(`/api/labor/estimates/${id}`),

  // Delete estimate
  delete: (id: string): Promise<{ message: string; id: string }> =>
    laborApiFetch<{ message: string; id: string }>(`/api/labor/estimates/${id}`, {
      method: 'DELETE',
    }),
};

// =============================================================================
// LABOR SETTINGS API
// =============================================================================

export const laborSettingsApi = {
  // Get settings
  get: (): Promise<LaborSettings> =>
    laborApiFetch<LaborSettings>('/api/labor/settings'),

  // Update settings
  update: (data: Partial<Omit<LaborSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<LaborSettings> =>
    laborApiFetch<LaborSettings>('/api/labor/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// TRAVEL CALCULATION API
// =============================================================================

export const laborTravelApi = {
  // Calculate travel between locations
  calculate: (layoutId: string, fromLocation?: string, toLocation?: string): Promise<{
    from_location?: string;
    to_location?: string;
    distance_pixels: number;
    distance_feet: number;
    travel_time_seconds: number;
    walk_speed_used: number;
  }> =>
    laborApiFetch('/api/labor/calculate-travel', {
      method: 'POST',
      body: JSON.stringify({
        layout_id: layoutId,
        from_location: fromLocation,
        to_location: toLocation,
      }),
    }),
};
```

---

## 6. UI Components

### 6.1 Component Structure Overview

```
frontend/components/labor/
├── ElementLibrary.tsx       # Left panel with draggable elements
├── ElementCard.tsx          # Individual draggable element
├── ProcessDesigner.tsx      # Main process designer container
├── TimelineItem.tsx         # Element in the timeline
├── ElementConfigModal.tsx   # Configure element (conditions, variables)
├── TemplateManager.tsx      # Template save/load/manage
├── BatchEstimator.tsx       # CSV upload and estimation
├── EstimateResults.tsx      # Results display
├── RunningTotals.tsx        # Live totals calculation
└── ColumnMapper.tsx         # Map CSV columns to fields
```

### 6.2 ElementLibrary Component

**File:** `frontend/components/labor/ElementLibrary.tsx`

> **Agent Note:** This component should:
> - Fetch elements using `laborElementsApi.getAll()`
> - Group elements by category using `ELEMENT_CATEGORY_CONFIG`
> - Support search filtering
> - Support category expansion/collapse
> - Make elements draggable using HTML5 drag-and-drop
> - Show element details on hover
> - Allow hiding elements (right-click menu)
> 
> **Reference:** Look at `frontend/components/designer/Sidebar.tsx` for the existing sidebar pattern with draggable elements.

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { laborElementsApi } from '@/lib/laborApi';
import { TimeElement, ElementCategory, ELEMENT_CATEGORY_CONFIG } from '@/lib/laborTypes';
import ElementCard from './ElementCard';

interface ElementLibraryProps {
  onDragStart: (element: TimeElement) => void;
}

export default function ElementLibrary({ onDragStart }: ElementLibraryProps) {
  const [elements, setElements] = useState<TimeElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<ElementCategory[]>([
    'pick_each', 'confirmation', 'body_motion'
  ]);

  useEffect(() => {
    loadElements();
  }, []);

  const loadElements = async () => {
    try {
      setLoading(true);
      const data = await laborElementsApi.getAll();
      setElements(data);
    } catch (error) {
      console.error('Failed to load elements:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: ElementCategory) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Group elements by category
  const groupedElements = elements.reduce((acc, element) => {
    const category = element.category as ElementCategory;
    if (!acc[category]) acc[category] = [];
    acc[category].push(element);
    return acc;
  }, {} as Record<ElementCategory, TimeElement[]>);

  // Filter by search
  const filteredGroups = Object.entries(groupedElements).reduce((acc, [category, elements]) => {
    const filtered = elements.filter(el =>
      el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category as ElementCategory] = filtered;
    }
    return acc;
  }, {} as Record<ElementCategory, TimeElement[]>);

  if (loading) {
    return (
      <div className="w-80 bg-slate-900 border-r border-slate-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-800 rounded"></div>
          <div className="h-8 bg-slate-800 rounded"></div>
          <div className="h-8 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Element Library
          </h2>
          <span className="text-xs text-slate-500">{elements.length} elements</span>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pl-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(ELEMENT_CATEGORY_CONFIG).map(([categoryKey, config]) => {
          const category = categoryKey as ElementCategory;
          const categoryElements = filteredGroups[category] || [];
          const isExpanded = expandedCategories.includes(category);

          if (categoryElements.length === 0 && searchQuery) return null;

          return (
            <div key={category} className="mb-2">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    style={{ color: config.color }}
                  >
                    ▶
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium text-white">{config.name}</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  {categoryElements.length}
                </span>
              </button>

              {isExpanded && (
                <div className="pl-2 mt-1 space-y-1">
                  {categoryElements.map((element) => (
                    <ElementCard
                      key={element.id}
                      element={element}
                      categoryColor={config.color}
                      onDragStart={() => onDragStart(element)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Elements Section */}
      <div className="p-4 border-t border-slate-700">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
          <span>+</span>
          <span>Create Custom Element</span>
        </button>
      </div>
    </div>
  );
}
```

### 6.3 ElementCard Component

**File:** `frontend/components/labor/ElementCard.tsx`

```typescript
'use client';

import React from 'react';
import { TimeElement } from '@/lib/laborTypes';

interface ElementCardProps {
  element: TimeElement;
  categoryColor: string;
  onDragStart: () => void;
}

export default function ElementCard({ element, categoryColor, onDragStart }: ElementCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(element));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group cursor-grab active:cursor-grabbing bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-2.5 transition-all"
      style={{ borderLeftWidth: '3px', borderLeftColor: categoryColor }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">≡</span>
          {element.icon && <span className="text-base">{element.icon}</span>}
          <span className="text-sm text-white">{element.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-green-400">
            {element.base_time_seconds}s
          </span>
          {Object.keys(element.variables || {}).length > 0 && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
              📏
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 6.4 ProcessDesigner Component

**File:** `frontend/components/labor/ProcessDesigner.tsx`

> **Agent Note:** This is the main component that contains:
> - Template name input
> - Save/Save As buttons
> - Timeline of elements (vertical list)
> - Drop zone for new elements
> - Integration with TemplateManager for saving
>
> **Reference:** Look at how `frontend/app/designer/page.tsx` handles element creation and state management.

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { TimeElement, ProcessTemplate, TemplateElement, CreateTemplateElementRequest } from '@/lib/laborTypes';
import { laborTemplatesApi } from '@/lib/laborApi';
import TimelineItem from './TimelineItem';
import ElementConfigModal from './ElementConfigModal';
import RunningTotals from './RunningTotals';

interface ProcessDesignerProps {
  template: ProcessTemplate | null;
  onTemplateChange: (template: ProcessTemplate) => void;
  onSave: () => Promise<void>;
}

export default function ProcessDesigner({ template, onTemplateChange, onSave }: ProcessDesignerProps) {
  const [templateName, setTemplateName] = useState(template?.name || 'New Process Template');
  const [timelineElements, setTimelineElements] = useState<TemplateElement[]>(template?.elements || []);
  const [dragOver, setDragOver] = useState(false);
  const [configModalElement, setConfigModalElement] = useState<TemplateElement | null>(null);
  const [saving, setSaving] = useState(false);

  // Handle drop from element library
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    try {
      const elementData = JSON.parse(e.dataTransfer.getData('application/json')) as TimeElement;
      
      const newSequence = timelineElements.length;
      
      const newElement: TemplateElement = {
        id: `temp-${Date.now()}`, // Temporary ID until saved
        template_id: template?.id || '',
        element_id: elementData.id,
        sequence_order: newSequence,
        is_conditional: false,
        conditions: {},
        variable_values: {},
        created_at: new Date().toISOString(),
        // Include joined fields for display
        element_code: elementData.code,
        element_name: elementData.name,
        element_category: elementData.category,
        base_time_seconds: elementData.base_time_seconds,
        time_unit: elementData.time_unit,
        icon: elementData.icon,
        element_variables: elementData.variables,
      };

      setTimelineElements(prev => [...prev, newElement]);

      // If template exists, persist to backend
      if (template?.id) {
        const saved = await laborTemplatesApi.addElement(template.id, {
          element_id: elementData.id,
          sequence_order: newSequence,
        });
        // Update with real ID
        setTimelineElements(prev => 
          prev.map(el => el.id === newElement.id ? { ...el, id: saved.id } : el)
        );
      }
    } catch (error) {
      console.error('Failed to add element:', error);
    }
  }, [template, timelineElements]);

  const handleRemoveElement = async (elementId: string) => {
    setTimelineElements(prev => prev.filter(el => el.id !== elementId));
    
    if (template?.id && !elementId.startsWith('temp-')) {
      await laborTemplatesApi.removeElement(template.id, elementId);
    }
  };

  const handleConfigureElement = (element: TemplateElement) => {
    setConfigModalElement(element);
  };

  const handleSaveConfig = async (updates: Partial<CreateTemplateElementRequest>) => {
    if (!configModalElement) return;

    setTimelineElements(prev =>
      prev.map(el => el.id === configModalElement.id ? { ...el, ...updates } : el)
    );

    if (template?.id && !configModalElement.id.startsWith('temp-')) {
      await laborTemplatesApi.updateElement(template.id, configModalElement.id, updates);
    }

    setConfigModalElement(null);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const fixedTime = timelineElements
    .filter(el => !el.is_conditional && el.time_unit === 'fixed')
    .reduce((sum, el) => sum + (el.base_time_seconds || 0), 0);

  const conditionalTime = timelineElements
    .filter(el => el.is_conditional)
    .reduce((sum, el) => sum + (el.base_time_seconds || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">Template:</span>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm w-96 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">
              Save As
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Pick Cycle Timeline
            </h2>
            <button
              onClick={() => setTimelineElements([])}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              🗑️ Clear All
            </button>
          </div>

          {/* Start marker */}
          <div className="flex items-center gap-2 mb-2 ml-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-mono font-semibold text-green-500">● START</span>
            <span className="text-xs font-mono text-slate-500">0.0s</span>
          </div>

          {/* Timeline elements */}
          <div className="space-y-1">
            {timelineElements.map((element, index) => (
              <TimelineItem
                key={element.id}
                element={element}
                index={index}
                onRemove={() => handleRemoveElement(element.id)}
                onConfigure={() => handleConfigureElement(element)}
              />
            ))}
          </div>

          {/* End marker */}
          <div className="flex items-center gap-2 mt-2 ml-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-mono font-semibold text-red-500">● END</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`mt-6 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className={`text-sm ${dragOver ? 'text-blue-400' : 'text-slate-500'}`}>
              ⬇️ Drop elements here to add to timeline ⬇️
            </span>
          </div>
        </div>

        {/* Running Totals */}
        <RunningTotals
          fixedTime={fixedTime}
          conditionalTime={conditionalTime}
          elements={timelineElements}
        />
      </div>

      {/* Config Modal */}
      {configModalElement && (
        <ElementConfigModal
          element={configModalElement}
          onSave={handleSaveConfig}
          onClose={() => setConfigModalElement(null)}
        />
      )}
    </div>
  );
}
```

### 6.5 Additional Components

> **Agent Note:** The remaining components follow similar patterns. Here are the key implementation notes for each:

#### TimelineItem.tsx
- Display element name, time, and conditional badge
- Show category color on left border
- Include remove button (visible on hover)
- Click to open configuration modal
- Reference the existing `frontend/components/designer/PropertiesPanel.tsx` for similar patterns

#### ElementConfigModal.tsx
- Modal dialog for configuring an element
- Conditional toggle with condition builder (slot_level, item_weight, item_type)
- Variable inputs based on `element_variables` (distance input, qty input, etc.)
- Save/Cancel buttons
- Reference `frontend/components/BulkRenameModal.tsx` for modal patterns

#### RunningTotals.tsx
- Display fixed time, conditional time, travel time (from heatmap)
- Calculate picks per hour
- Show breakdown cards with different colors
- Animate number changes

#### BatchEstimator.tsx
- File upload zone (drag-and-drop)
- Column mapping interface
- Template selection dropdowns
- PF&D allowance input
- Run estimation button
- Reference `frontend/components/upload/` for file upload patterns

#### EstimateResults.tsx
- Summary cards (total picks, time, avg per pick, picks/hr)
- Time breakdown visualization (horizontal bar chart)
- Batch-by-batch table with status indicators
- Staffing calculator section
- Export buttons (PDF, CSV)

#### ColumnMapper.tsx
- Display detected columns from CSV
- Dropdown for each required/optional field mapping
- Auto-detect common column names
- Reference `frontend/components/upload/ColumnMappingStep.tsx` if it exists

---

## 7. Page Implementation

**File:** `frontend/app/labor/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ElementLibrary from '@/components/labor/ElementLibrary';
import ProcessDesigner from '@/components/labor/ProcessDesigner';
import TemplateManager from '@/components/labor/TemplateManager';
import BatchEstimator from '@/components/labor/BatchEstimator';
import { laborTemplatesApi, laborSettingsApi } from '@/lib/laborApi';
import { ProcessTemplate, LaborSettings, TimeElement } from '@/lib/laborTypes';

type ActiveTab = 'designer' | 'estimator' | 'history';

export default function LaborPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('designer');
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ProcessTemplate | null>(null);
  const [settings, setSettings] = useState<LaborSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedElement, setDraggedElement] = useState<TimeElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, settingsData] = await Promise.all([
        laborTemplatesApi.getAll(),
        laborSettingsApi.get(),
      ]);
      setTemplates(templatesData);
      setSettings(settingsData);

      // Select first template or create new
      if (templatesData.length > 0) {
        const defaultTemplate = templatesData.find(t => t.is_default) || templatesData[0];
        const fullTemplate = await laborTemplatesApi.get(defaultTemplate.id);
        setCurrentTemplate(fullTemplate);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const newTemplate = await laborTemplatesApi.create({
        name: 'New Process Template',
        category: 'piece_picking',
      });
      setTemplates(prev => [newTemplate, ...prev]);
      setCurrentTemplate(newTemplate);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate) return;
    // Template elements are saved individually as they're added
    // This just updates the template metadata if needed
    await laborTemplatesApi.update(currentTemplate.id, {
      name: currentTemplate.name,
    });
  };

  const handleSelectTemplate = async (template: ProcessTemplate) => {
    try {
      const fullTemplate = await laborTemplatesApi.get(template.id);
      setCurrentTemplate(fullTemplate);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header
        userEmail=""
        layout={null}
        currentLayoutId={null}
        onLayoutSelect={() => {}}
        onLayoutCreate={() => {}}
        onLayoutRename={() => {}}
        onLayoutDelete={() => {}}
      />

      {/* Tabs */}
      <div className="border-b border-slate-700 bg-slate-900">
        <div className="flex items-center px-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700 mr-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1.5 rounded-lg text-sm font-bold text-white">
              ELS
            </div>
            <span className="text-lg font-semibold text-white">Labor Standards Builder</span>
          </div>

          {/* Tab buttons */}
          <div className="flex">
            {[
              { id: 'designer', label: 'Process Designer' },
              { id: 'estimator', label: 'Batch Estimator' },
              { id: 'history', label: 'Saved Estimates' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Template selector */}
          {activeTab === 'designer' && (
            <div className="ml-auto flex items-center gap-3">
              <select
                value={currentTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  if (template) handleSelectTemplate(template);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateTemplate}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white"
              >
                + New
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'designer' && (
          <>
            <ElementLibrary onDragStart={setDraggedElement} />
            <ProcessDesigner
              template={currentTemplate}
              onTemplateChange={setCurrentTemplate}
              onSave={handleSaveTemplate}
            />
          </>
        )}

        {activeTab === 'estimator' && (
          <BatchEstimator
            templates={templates}
            settings={settings}
          />
        )}

        {activeTab === 'history' && (
          <div className="flex-1 p-6">
            {/* Saved estimates list - implement similar to layouts list */}
            <h2 className="text-xl font-semibold text-white mb-4">Saved Estimates</h2>
            {/* TODO: Implement estimates history list */}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 8. Integration with Existing Features

### 8.1 Add Navigation Link

**File:** `frontend/components/Header.tsx`

Add a link to the Labor Standards page in the navigation:

```typescript
// Add to the navigation links section
<Link
  href="/labor"
  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    pathname === '/labor'
      ? 'bg-blue-600 text-white'
      : 'text-slate-300 hover:text-white hover:bg-slate-700'
  }`}
>
  Labor Standards
</Link>
```

### 8.2 Heatmap Integration

> **Agent Note:** To integrate with the existing heatmap:
> 
> 1. Review `frontend/lib/distanceCalculation.ts` for existing distance calculation logic
> 2. Review `frontend/components/WarehouseCanvas.tsx` for how route markers are handled
> 3. The `laborTravelApi.calculate()` endpoint uses the same coordinate system
> 4. When running batch estimates with a `layout_id`, travel times are automatically calculated using the warehouse layout

### 8.3 Walk Burden Connection

The existing walk burden calculations in the heatmap can be enhanced to show:
- Estimated pick times per element (based on assigned templates)
- Labor cost per element (picks × time × hourly rate)

> **Agent Note:** Review `frontend/app/heatmap/page.tsx` to understand the current walk burden feature and how to add labor time data to the existing visualization.

---

## 9. Seed Data

**File:** `frontend/lib/laborElementsData.ts`

This file contains the system elements to be seeded. The full list is in the product specification, but here's a sample structure:

```typescript
// frontend/lib/laborElementsData.ts

import { CreateTimeElementRequest, ElementCategory } from './laborTypes';

export const SYSTEM_ELEMENTS: CreateTimeElementRequest[] = [
  // TRAVEL
  {
    code: 'TRV-WALK-FT',
    name: 'Walk (per foot)',
    category: 'travel',
    base_time_seconds: 0.035,
    time_unit: 'per_foot',
    description: 'Walking time, calculated from heatmap distance',
    icon: '═══',
    variables: { distance: true },
  },
  {
    code: 'TRV-TURN-90',
    name: 'Turn 90°',
    category: 'travel',
    base_time_seconds: 0.4,
    time_unit: 'fixed',
    icon: '↻',
  },
  // ... more elements from the spec

  // BODY MOTION
  {
    code: 'BDY-BEND',
    name: 'Bend at waist',
    category: 'body_motion',
    base_time_seconds: 1.1,
    time_unit: 'fixed',
    description: 'Bending to floor level',
    icon: '↓',
  },
  // ... continue with all 85+ elements from the product spec
];
```

### 9.1 Seeding Script

**File:** `backend/scripts/seedLaborElements.js`

```javascript
// backend/scripts/seedLaborElements.js

const { query } = require('../db');

const SYSTEM_ELEMENTS = [
  // Copy from frontend/lib/laborElementsData.ts or define here
  // Each element needs: code, name, category, base_time_seconds, time_unit, description, icon, variables
];

async function seedElements() {
  console.log('Seeding system time elements...');

  for (const element of SYSTEM_ELEMENTS) {
    try {
      await query(
        `INSERT INTO time_elements 
         (code, name, category, base_time_seconds, time_unit, description, icon, variables, is_system, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NULL)
         ON CONFLICT (user_id, code) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           base_time_seconds = EXCLUDED.base_time_seconds,
           time_unit = EXCLUDED.time_unit,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           variables = EXCLUDED.variables`,
        [
          element.code,
          element.name,
          element.category,
          element.base_time_seconds,
          element.time_unit || 'fixed',
          element.description || null,
          element.icon || null,
          element.variables || {},
        ]
      );
      console.log(`  ✓ ${element.code}: ${element.name}`);
    } catch (error) {
      console.error(`  ✗ ${element.code}: ${error.message}`);
    }
  }

  console.log('Done!');
}

seedElements().catch(console.error);
```

Run with: `node backend/scripts/seedLaborElements.js`

---

## 10. Testing Checklist

### 10.1 Database

- [ ] All 6 tables created successfully
- [ ] RLS policies in place
- [ ] Indexes created
- [ ] Foreign key constraints working
- [ ] System elements seeded

### 10.2 Backend API

- [ ] `GET /api/labor/elements` returns system + custom elements
- [ ] `POST /api/labor/elements` creates custom element
- [ ] `PUT /api/labor/elements/:id` updates custom element (not system)
- [ ] `DELETE /api/labor/elements/:id` deletes custom element
- [ ] `GET /api/labor/templates` returns user templates
- [ ] `POST /api/labor/templates` creates template
- [ ] `POST /api/labor/templates/:id/elements` adds element to template
- [ ] `PUT /api/labor/templates/:id/elements/reorder` reorders elements
- [ ] `POST /api/labor/estimate` processes CSV and returns results
- [ ] `GET /api/labor/settings` returns user settings
- [ ] `PUT /api/labor/settings` updates settings
- [ ] `POST /api/labor/calculate-travel` calculates travel time

### 10.3 Frontend

- [ ] Element Library loads and displays categories
- [ ] Elements are draggable
- [ ] Search filters elements
- [ ] Process Designer accepts dropped elements
- [ ] Timeline displays elements in order
- [ ] Running totals update correctly
- [ ] Element configuration modal works
- [ ] Templates can be saved/loaded
- [ ] Batch Estimator uploads CSV
- [ ] Column mapping works
- [ ] Estimation results display correctly
- [ ] Navigation link to /labor works

### 10.4 Integration

- [ ] Travel time uses heatmap coordinates when layout_id provided
- [ ] Templates apply correctly to pick data
- [ ] Conditional elements apply based on slot_level, item_weight
- [ ] PF&D allowance applied to totals
- [ ] Batch summaries group correctly

---

## Appendix: Quick Reference

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labor/elements` | Get all elements |
| POST | `/api/labor/elements` | Create custom element |
| PUT | `/api/labor/elements/:id` | Update element |
| DELETE | `/api/labor/elements/:id` | Delete element |
| GET | `/api/labor/templates` | Get all templates |
| GET | `/api/labor/templates/:id` | Get template with elements |
| POST | `/api/labor/templates` | Create template |
| PUT | `/api/labor/templates/:id` | Update template |
| DELETE | `/api/labor/templates/:id` | Delete template |
| POST | `/api/labor/templates/:id/clone` | Clone template |
| POST | `/api/labor/templates/:id/elements` | Add element to template |
| PUT | `/api/labor/templates/:id/elements/:elemId` | Update element in template |
| DELETE | `/api/labor/templates/:id/elements/:elemId` | Remove element |
| PUT | `/api/labor/templates/:id/elements/reorder` | Reorder elements |
| POST | `/api/labor/estimate` | Run batch estimation |
| GET | `/api/labor/estimates` | Get saved estimates |
| GET | `/api/labor/estimates/:id` | Get estimate details |
| DELETE | `/api/labor/estimates/:id` | Delete estimate |
| GET | `/api/labor/settings` | Get labor settings |
| PUT | `/api/labor/settings` | Update settings |
| POST | `/api/labor/calculate-travel` | Calculate travel time |

### Key Files to Create

```
backend/
├── routes/laborElements.js
├── routes/laborTemplates.js
├── routes/laborEstimates.js
├── middleware/validateLabor.js
├── db/migrations/007_labor_standards.sql
└── scripts/seedLaborElements.js

frontend/
├── app/labor/page.tsx
├── components/labor/ElementLibrary.tsx
├── components/labor/ElementCard.tsx
├── components/labor/ProcessDesigner.tsx
├── components/labor/TimelineItem.tsx
├── components/labor/ElementConfigModal.tsx
├── components/labor/TemplateManager.tsx
├── components/labor/BatchEstimator.tsx
├── components/labor/EstimateResults.tsx
├── components/labor/RunningTotals.tsx
├── components/labor/ColumnMapper.tsx
├── lib/laborTypes.ts
├── lib/laborApi.ts
└── lib/laborElementsData.ts
```

---

*End of Implementation Specification*
