# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Warehouse Slotting Heatmap Visualization Tool** - a web-based application that helps warehouse operations teams draw their layout, ingest pick datasets, and visualize pick intensity by bay/location. The application includes warehouse drawing, pick data upload (CSV/Excel), heatmap visualization, velocity analysis, and slotting recommendations.

**Current Phase:** Production-ready MVP with full feature set
**Tech Stack:** Node.js/Express backend, Next.js 14 frontend, PostgreSQL (Supabase), Supabase Auth

## Development Commands

### Backend (Node.js/Express)
```bash
cd backend
npm run dev          # Start development server with nodemon (auto-reload)
npm start            # Start production server
```
Backend runs on `http://localhost:3001`

### Frontend (Next.js 14)
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```
Frontend runs on `http://localhost:3000`

### Database
- Database schema: `backend/scripts/migrate.sql`
- Run SQL migrations directly in Supabase SQL Editor
- Connection configured via `DATABASE_URL` environment variable

### PowerShell Execution Policy (Windows)
If you encounter execution policy errors when running npm scripts:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
```
Or use Command Prompt (cmd.exe) instead of PowerShell.

## Architecture

### Backend Structure
```
backend/
├── server.js              # Express app entry point, middleware, error handling
├── db/
│   └── index.js          # PostgreSQL connection pool, query helper
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── layouts.js        # Layout CRUD endpoints (paginated)
│   ├── bays.js           # Warehouse element CRUD (paginated)
│   ├── picks.js          # Pick data upload, aggregation, export
│   ├── items.js          # Item/SKU management
│   ├── locations.js      # Location/slot management
│   ├── routeMarkers.js   # Route markers (start/stop points)
│   ├── user.js           # User preferences
│   ├── stripe.js         # Billing/subscription
│   └── waitlist.js       # Waitlist management
├── middleware/
│   ├── auth.js           # Supabase JWT verification
│   ├── validate.js       # Input validation (elements, layouts, UUIDs)
│   ├── limits.js         # Subscription tier limits
│   └── audit.js          # Audit logging middleware
├── config/
│   └── tiers.js          # Subscription tier configuration
└── scripts/
    └── migrate.sql       # Database schema
```

**Key Backend Patterns:**
- Express.js with async/await route handlers
- PostgreSQL via `pg` library with connection pooling
- Supabase Auth integration (JWT verification)
- Input validation middleware on all mutating endpoints
- Audit logging on data modifications
- Paginated list endpoints

### Frontend Structure
```
frontend/
├── app/
│   ├── layout.tsx        # Root layout with metadata
│   ├── page.tsx          # Homepage with layout templates
│   ├── designer/         # Warehouse drawing canvas
│   ├── heatmap/          # Heatmap visualization
│   ├── upload/           # CSV/Excel upload wizard
│   ├── dashboard/        # Analytics dashboard
│   └── profile/          # User settings
├── components/
│   ├── designer/         # Canvas tools, sidebar, status bar
│   ├── heatmap/          # Heatmap modals, alerts
│   ├── upload/           # Upload wizard steps
│   ├── home/             # Template selector, quick actions
│   └── ...               # Shared components
└── lib/
    ├── api.ts            # API client with pagination support
    ├── csvValidation.ts  # CSV/Excel validation with fuzzy matching
    ├── excelParser.ts    # Excel file parsing
    ├── exportData.ts     # CSV export utilities
    ├── templates/        # Layout templates (JSON)
    └── types.ts          # TypeScript interfaces
```

**Key Frontend Patterns:**
- Next.js 14 App Router (server components by default)
- TypeScript for type safety
- Tailwind CSS for styling
- react-konva for canvas-based warehouse layout drawing
- Supabase Auth for authentication
- Client components for interactivity (`'use client'` directive)

### Database Schema

**Core Tables:**
- `users` - User accounts (synced from Supabase Auth)
- `layouts` - Warehouse layouts (one per user)
- `warehouse_elements` - Bays, flow racks, pallets, annotations
- `pick_transactions` - Element-level pick data (legacy)
- `item_pick_transactions` - Item-level pick data
- `items` - SKU/product inventory
- `locations` - Slot positions within elements
- `route_markers` - Start/stop/parking points
- `user_preferences` - User settings
- `audit_log` - Data modification audit trail

**Key Relationships:**
- `layouts.user_id` → `users.id` (CASCADE DELETE)
- `warehouse_elements.layout_id` → `layouts.id` (CASCADE DELETE)
- `items.layout_id` → `layouts.id`
- `locations.element_id` → `warehouse_elements.id`

**Coordinates System:**
- Elements use decimal coordinates (x, y, width, height)
- Default canvas: 1200x800 pixels
- Rotation in degrees (0-360)
- 1 pixel = 1 inch for distance calculations

## Current Implementation Status

### ✅ Completed Features

**Authentication & Authorization:**
- Supabase Auth integration (email/password, magic link)
- JWT verification middleware
- Row-level security in database

**Warehouse Designer:**
- Canvas drawing with react-konva
- Element types: bay, flow_rack, full_pallet, text, line, arrow
- Route markers (start, stop, cart parking)
- Snapping and alignment tools
- Easy Mode toggle (simplified UI)
- Layout templates (Quick Grid, U-Shape, I-Shape, etc.)

**Pick Data Management:**
- CSV upload with validation
- Excel (.xlsx) upload support
- Fuzzy name matching for element names
- Item-level and element-level data formats
- Bulk insert optimization (batched queries)

**Heatmap Visualization:**
- Pick intensity color coding
- Walk burden analysis
- Distance calculations from parking spots
- Element and item detail modals
- Date range filtering

**Data Export:**
- Element-level velocity analysis CSV
- Item-level data with rankings CSV
- Velocity tier classification (A/B/C)

**Production Features:**
- Audit logging on data modifications
- Paginated list endpoints
- Input validation middleware
- Subscription tier limits

## API Response Formats

### Paginated Endpoints
List endpoints return paginated responses:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

Query parameters:
- `?page=1` - Page number (default: 1)
- `?limit=20` - Items per page (default: 20, max: 100)

### Standard Responses
- `GET` requests return data or paginated response
- `POST` requests return created resource with `201` status
- `PUT` requests return updated resource
- `DELETE` requests return `{ message, id }`
- Errors return `{ error: "message" }` with appropriate status code

## Environment Variables

**Backend (.env):**
```
PORT=3001
DATABASE_URL=postgresql://[connection-string]
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

## Key Dependencies

**Backend:**
- `express` - Web framework
- `pg` - PostgreSQL client
- `multer` - File upload handling
- `csv-parser` - CSV parsing
- `cors` - CORS middleware
- `dotenv` - Environment variables

**Frontend:**
- `next` v14 - React framework
- `react-konva` - Canvas drawing
- `@supabase/supabase-js` - Auth client
- `papaparse` - CSV parsing
- `xlsx` - Excel parsing
- `tailwindcss` - CSS framework
- `typescript` - Type safety

## Common Gotchas

1. **Supabase Auth**: Ensure `SUPABASE_SERVICE_KEY` is the service role key, not the anon key.

2. **Paginated Responses**: Frontend must extract `.data` from paginated endpoints.

3. **Element Limits**: Subscription tiers limit the number of elements per layout.

4. **Pick History Limits**: Subscription tiers limit how far back pick data is retained.

5. **UUID Primary Keys**: All tables use UUID, not auto-increment integers.

6. **Windows Path Issues**: Use forward slashes in import paths.

## File Naming Conventions

- Backend: snake_case for database columns, camelCase for JavaScript
- Frontend: PascalCase for components, camelCase for utilities
- Routes: kebab-case for API endpoints (`/api/picks/upload`)
- TypeScript: `.tsx` for components with JSX, `.ts` for utilities

## References

- Implementation plan: `final_implementation.md`
- Database schema: `backend/scripts/migrate.sql`
