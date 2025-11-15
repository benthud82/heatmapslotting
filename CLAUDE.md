# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Warehouse Slotting Heatmap Visualization Tool** - a web-based application that helps warehouse operations teams draw their layout, ingest pick datasets, and visualize pick intensity by bay/location. The MVP focuses on the warehouse bay drawing and layout management features, with future phases planned for heatmap visualization, dataset ingestion, ABC analysis, and travel path optimization.

**Current Phase:** Basic warehouse bay drawer MVP with layout management
**Tech Stack:** Node.js/Express backend, Next.js 14 frontend, PostgreSQL (Supabase)

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
│   ├── auth.js           # Authentication endpoints (placeholder)
│   ├── layouts.js        # Layout CRUD endpoints (placeholder)
│   └── bays.js           # Bay CRUD endpoints (placeholder)
├── middleware/
│   └── auth.js           # Mock JWT authentication (to be implemented)
└── scripts/
    └── migrate.sql       # Database schema
```

**Key Backend Patterns:**
- Express.js with async/await route handlers
- PostgreSQL via `pg` library with connection pooling
- Authentication middleware applied to protected routes
- Centralized error handling middleware in `server.js`
- Database connection tested on server startup

### Frontend Structure
```
frontend/
├── app/
│   ├── layout.tsx        # Root layout with metadata
│   └── page.tsx          # Homepage (Next.js default)
└── (to be created)
    ├── components/       # React components for layout editor, bay drawer
    └── lib/              # API client, utilities
```

**Key Frontend Patterns:**
- Next.js 14 App Router (server components by default)
- TypeScript for type safety
- Tailwind CSS for styling
- react-konva for canvas-based warehouse layout drawing
- Client components needed for interactivity (`'use client'` directive)

### Database Schema

**Core Tables:**
- `users` - User accounts with email/password authentication
- `layouts` - Saved warehouse layouts (canvas dimensions, metadata)
- `bays` - Individual bay/location elements drawn on layouts

**Key Relationships:**
- `layouts.user_id` → `users.id` (CASCADE DELETE)
- `bays.layout_id` → `layouts.id` (CASCADE DELETE)

**Coordinates System:**
- Bays use decimal coordinates (x, y, width, height)
- Default canvas: 1200x800 pixels
- Rotation in degrees (0-360)

## Current Implementation Status

### ✅ Completed
- Backend server setup with Express
- Database connection with PostgreSQL (Supabase)
- Database schema created (users, layouts, bays)
- Mock authentication middleware
- Route structure (auth, layouts, bays) with placeholders
- Frontend Next.js 14 setup with TypeScript and Tailwind
- CORS configuration for local development

### ⚠️ Pending Implementation (Next Steps)
1. **Authentication API** - Implement register/login with bcrypt + JWT
2. **Layout API** - CRUD operations for warehouse layouts
3. **Bay API** - CRUD operations for bay elements
4. **Frontend Auth** - Login/register pages, auth context
5. **Layout Manager** - UI for creating/loading/saving layouts
6. **Bay Drawing Canvas** - react-konva canvas for drawing bays

See `NEXT_STEPS.md` for detailed implementation plan.

## Important Implementation Notes

### Authentication Flow
- Backend uses JWT tokens for authentication
- Mock auth middleware currently returns fixed user ID for development
- Real implementation: hash passwords with bcrypt, sign JWT with `JWT_SECRET`
- Frontend must store JWT in localStorage and send in Authorization header
- Auth middleware should verify JWT and attach `req.user` to requests

### Layout and Bay Management
- All layout/bay operations require authentication
- User can only access their own layouts (enforce `user_id` filtering)
- Bay coordinates are relative to canvas origin (top-left = 0,0)
- Bays support rotation for representing angled warehouse aisles
- Color property stores hex color codes for visual differentiation

### Canvas Drawing with react-konva
- Use `Stage`, `Layer`, `Rect`, `Text` components from react-konva
- Drawing flow: user selects tool → mousedown starts shape → mousemove resizes → mouseup finalizes
- Selected bays should be visually highlighted
- Double-click bay labels for inline editing
- Real-time save to backend as bays are created/modified

### Environment Variables
**Backend (.env):**
```
PORT=3001
DATABASE_URL=postgresql://[connection-string]
JWT_SECRET=[random-secret]
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### API Response Formats
Follow REST conventions:
- `GET` requests return data or arrays
- `POST` requests return created resource with `201` status
- `PUT` requests return updated resource
- `DELETE` requests return `204` or success message
- Errors return `{ error: "message" }` with appropriate status code

## Future Features (Post-MVP)

The spec (`warehouse-slotting-mvp-spec.md`) includes detailed code examples for:
- **Dataset Upload** - CSV ingestion with stream parsing (Multer, fast-csv)
- **Heatmap Visualization** - D3.js color scales, canvas rendering
- **ABC Analysis** - SKU classification dashboard
- **Travel Path Analysis** - Pick route optimization
- **ROI Calculator** - Savings projection tool

These are **deferred** until the MVP bay drawer is complete.

## Testing Recommendations

### Backend API Testing
Use curl or Postman to test endpoints:
```bash
# Health check
curl http://localhost:3001/api/health

# Test auth route (mock)
curl http://localhost:3001/api/auth/test

# Test layout route (mock)
curl http://localhost:3001/api/layouts/test
```

### Database Queries
Test queries in Supabase SQL Editor before implementing in code.

### Frontend Development
- Use React DevTools for component debugging
- Check browser console for API errors
- Verify CORS headers if API calls fail

## Common Gotchas

1. **PostgreSQL SSL Connection**: Supabase requires SSL in production. The db config handles this via `NODE_ENV`.

2. **UUID Primary Keys**: All tables use UUID, not auto-increment integers. Use `gen_random_uuid()` in PostgreSQL or generate client-side.

3. **Decimal Coordinates**: Bay coordinates are `DECIMAL(10,2)`, not floats. Ensure precision when saving from canvas.

4. **Mock Auth**: Current auth middleware always succeeds. Don't forget to implement real JWT verification before production.

5. **Windows Path Issues**: Use forward slashes in import paths. PowerShell requires execution policy changes for npm scripts.

6. **Next.js Client Components**: Canvas interactions require `'use client'` directive at top of component files.

## Key Dependencies

**Backend:**
- `express` v5.1.0 - Web framework
- `pg` v8.16.3 - PostgreSQL client
- `bcrypt` v6.0.0 - Password hashing
- `jsonwebtoken` v9.0.2 - JWT tokens
- `cors` v2.8.5 - CORS middleware
- `dotenv` v17.2.3 - Environment variables
- `nodemon` v3.1.10 (dev) - Auto-reload

**Frontend:**
- `next` v14.2.33 - React framework
- `react` / `react-dom` v18 - UI library
- `react-konva` v19.2.0 - Canvas drawing
- `konva` v10.0.8 - Canvas library
- `nanoid` v5.1.6 - Unique ID generation
- `tailwindcss` v3.4.1 - CSS framework
- `typescript` v5 - Type safety

## File Naming Conventions

- Backend: snake_case for database columns, camelCase for JavaScript
- Frontend: PascalCase for components, camelCase for utilities
- Routes: kebab-case for API endpoints (`/api/auth/register`)
- TypeScript: `.tsx` for components with JSX, `.ts` for utilities

## References

- Full spec with code examples: `warehouse-slotting-mvp-spec.md`
- Setup instructions: `SETUP_INSTRUCTIONS.md`
- Running servers: `RUN_SERVERS.md`
- Implementation roadmap: `NEXT_STEPS.md`
