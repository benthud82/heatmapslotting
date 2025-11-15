# Next Steps - Implementation Plan

## Current Status ✅
- ✅ Backend server running
- ✅ Frontend server running
- ✅ Database schema updated (warehouse_elements with element_type)
- ✅ Layout API implemented (get/create/update single layout)
- ✅ Warehouse Elements API implemented (full CRUD)
- ✅ Frontend components built (Toolbar, Canvas, Main Page)
- ✅ Auto-save functionality implemented
- ✅ Mock authentication middleware active

## MVP Complete! 🎉

The warehouse element placement MVP is now complete. You can:
- Place Bays (24" × 48")
- Place Flow Racks (120" × 120")
- Place Full Pallets (48" × 52")
- Move elements by dragging
- Rotate elements
- Edit labels (double-click)
- Delete elements
- Auto-saves all changes to database

## How to Test

### Step 1: Update Database Schema
Run the SQL script in Supabase SQL Editor:
```sql
-- Located in: backend/scripts/migrate.sql
```

### Step 2: Start Backend Server
```bash
cd backend
npm run dev
```

Backend runs on http://localhost:3001

### Step 3: Start Frontend Server
```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:3000

### Step 4: Test the Application
1. Open http://localhost:3000
2. Select an element type (Bay, Flow Rack, or Full Pallet)
3. Click on canvas to place element
4. Drag to move elements
5. Select element and use rotation handles
6. Double-click to edit labels
7. Select element and click "Delete Selected"

---

## Original Implementation Plan (For Reference)

### Phase 1: Backend API Implementation (Start Here)

#### 1.1 Authentication API ⚠️ CRITICAL - Do This First
**File:** `backend/routes/auth.js`

**Implement:**
- `POST /api/auth/register` - User registration with email/password
  - Hash password with bcrypt
  - Store in users table
  - Return JWT token
  
- `POST /api/auth/login` - User login
  - Verify email/password
  - Return JWT token

**Update:** `backend/middleware/auth.js`
- Replace mock auth with real JWT verification
- Extract user from token and set `req.user`

**Why First:** All other endpoints require authentication, so this must work before anything else.

---

#### 1.2 Layout API
**File:** `backend/routes/layouts.js`

**Implement:**
- `GET /api/layouts` - Get all layouts for authenticated user
- `POST /api/layouts` - Create new layout
- `GET /api/layouts/:id` - Get single layout with all bays
- `PUT /api/layouts/:id` - Update layout (name, canvas dimensions)
- `DELETE /api/layouts/:id` - Delete layout (cascades to bays)

**Note:** The spec already has example code for these endpoints (lines 536-653 in spec).

---

#### 1.3 Bay API
**File:** `backend/routes/bays.js`

**Implement:**
- `POST /api/layouts/:layoutId/bays` - Create bay in a layout
- `PUT /api/bays/:id` - Update bay (position, size, label, color, rotation)
- `DELETE /api/bays/:id` - Delete bay

**Note:** The spec already has example code for these endpoints (lines 656-745 in spec).

---

### Phase 2: Frontend Implementation

#### 2.1 Authentication Pages
**Files to Create:**
- `frontend/app/login/page.tsx` - Login page
- `frontend/app/register/page.tsx` - Registration page
- `frontend/components/AuthContext.tsx` - Auth context for managing user state
- `frontend/lib/api.ts` - API client with token management

**Features:**
- Login form (email/password)
- Register form (email/password)
- Store JWT token in localStorage
- Redirect to main app after login
- Protect routes that require authentication

---

#### 2.2 Layout Management UI
**File:** `frontend/components/LayoutManager.tsx`

**Features:**
- List of user's layouts (dropdown/select)
- Create new layout button
- Load existing layout
- Save layout button
- Layout name input field

**Note:** The spec has example code (lines 375-532 in spec).

---

#### 2.3 Bay Drawing Canvas
**File:** `frontend/components/BayDrawerCanvas.tsx`

**Features:**
- Canvas using react-konva (Stage, Layer, Rect, Text)
- Click and drag to draw new bay
- Click bay to select it
- Double-click bay to edit label
- Delete selected bay
- Real-time updates to backend as bays are created/modified

**Note:** The spec has example code (lines 146-372 in spec).

---

#### 2.4 Main App Page
**File:** `frontend/app/page.tsx` (or create `frontend/app/dashboard/page.tsx`)

**Features:**
- Check if user is authenticated
- If not authenticated → redirect to login
- If authenticated → show LayoutManager component

---

## Recommended Implementation Sequence

### Step 1: Authentication Backend (30-45 min)
1. Implement register endpoint
2. Implement login endpoint  
3. Update auth middleware to verify JWT tokens
4. Test with Postman/curl

### Step 2: Authentication Frontend (30-45 min)
1. Create login page
2. Create register page
3. Create auth context
4. Create API client
5. Test login/register flow

### Step 3: Layout API Backend (20-30 min)
1. Implement all layout CRUD endpoints
2. Test endpoints

### Step 4: Bay API Backend (20-30 min)
1. Implement all bay CRUD endpoints
2. Test endpoints

### Step 5: Layout Manager Frontend (30-45 min)
1. Create LayoutManager component
2. Connect to layout API
3. Test create/load/save layouts

### Step 6: Bay Drawing Canvas (45-60 min)
1. Create BayDrawerCanvas component
2. Implement drawing functionality
3. Connect to bay API
4. Test full flow: create layout → draw bays → save

---

## Testing Checklist

After each phase, test:
- [ ] Backend endpoints work (use Postman or curl)
- [ ] Database operations succeed
- [ ] Error handling works (invalid data, missing auth, etc.)
- [ ] Frontend can communicate with backend
- [ ] Authentication flow works end-to-end

---

## Quick Start Commands

**Test Backend API:**
```powershell
# Register user
curl -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'

# Get layouts (use token from login)
curl http://localhost:3001/api/layouts -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Questions to Consider

1. **Do you want me to implement all of this now?** 
   - I can implement everything step by step
   - Or you can tell me which phase to start with

2. **Authentication approach:**
   - Should I implement full JWT auth now?
   - Or keep mock auth for now and implement real auth later?

3. **Frontend routing:**
   - Use Next.js App Router (current setup)?
   - Or prefer a different structure?

---

## Estimated Total Time
- Backend APIs: ~2 hours
- Frontend Components: ~2-3 hours
- Testing & Bug Fixes: ~1 hour
- **Total: ~5-6 hours**

Ready to start? Let me know which phase you'd like me to begin with!

