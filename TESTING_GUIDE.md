# Testing Guide - Warehouse Element Placement MVP

## Prerequisites

Before testing, you need to:

### 1. Set Up Database Connection

Update `backend/.env` with your **real** Supabase database connection string:

```env
PORT=3001
DATABASE_URL=postgresql://YOUR_SUPABASE_CONNECTION_STRING_HERE
JWT_SECRET=your-random-secret-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**How to get your Supabase connection string:**
1. Go to [supabase.com](https://supabase.com) and sign in
2. Navigate to your project (or create a new one)
3. Go to **Settings** > **Database**
4. Copy the **Connection string** (under "Connection pooling" or "Direct connection")
5. Replace `[YOUR-PASSWORD]` in the connection string with your database password

### 2. Run Database Migration

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Open the file `backend/scripts/migrate.sql`
4. Copy all the SQL content
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the migration

This will create:
- `users` table
- `layouts` table
- `warehouse_elements` table
- All necessary indexes

---

## Running the Application

### Terminal 1: Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
🚀 Server running on http://localhost:3001
📊 Environment: development
✅ Database connected successfully
Database connection test successful: { now: ... }
```

If you see database connection errors, double-check your `DATABASE_URL` in `backend/.env`.

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

**Expected output:**
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

---

## Testing Checklist

### ✅ Basic Functionality

1. **Load Application**
   - [ ] Open http://localhost:3000
   - [ ] Page loads without errors
   - [ ] You see "Warehouse Element Placement" header
   - [ ] Canvas (white grid) is displayed
   - [ ] Toolbar shows three element buttons

2. **Place a Bay (24" × 48")**
   - [ ] Click "Bay (24" × 48")" button (blue color indicator)
   - [ ] Click anywhere on the canvas
   - [ ] A blue rectangle appears
   - [ ] Check browser console - should see API call succeeding
   - [ ] "Saving..." indicator briefly appears in header

3. **Place a Flow Rack (120" × 120")**
   - [ ] Click "Flow Rack (120" × 120")" button (green color indicator)
   - [ ] Click on canvas (different location)
   - [ ] A green square appears
   - [ ] Element auto-saves to database

4. **Place a Full Pallet (48" × 52")**
   - [ ] Click "Full Pallet (48" × 52")" button (yellow color indicator)
   - [ ] Click on canvas
   - [ ] A yellow rectangle appears
   - [ ] Element auto-saves

### ✅ Movement & Interaction

5. **Move Elements**
   - [ ] Click and drag any element
   - [ ] Element moves smoothly
   - [ ] Release mouse - position auto-saves
   - [ ] Refresh page - element is in new position

6. **Rotate Elements**
   - [ ] Click on an element to select it
   - [ ] Blue border and rotation handle appear
   - [ ] Drag the rotation handle
   - [ ] Element rotates
   - [ ] Release - rotation auto-saves
   - [ ] Refresh page - rotation persists

7. **Edit Labels**
   - [ ] Double-click an element
   - [ ] (Note: Label editing UI needs refinement - this feature is implemented in code but may need UX improvements)

8. **Delete Elements**
   - [ ] Click an element to select it
   - [ ] "Delete Selected" button becomes enabled (red)
   - [ ] Click "Delete Selected"
   - [ ] Element disappears
   - [ ] Deletion auto-saves
   - [ ] Refresh page - element stays deleted

### ✅ Persistence

9. **Data Persistence**
   - [ ] Place several elements (different types)
   - [ ] Move and rotate them
   - [ ] Close browser tab
   - [ ] Open http://localhost:3000 again
   - [ ] All elements appear in same positions

### ✅ Error Handling

10. **Network Error Handling**
    - [ ] Stop backend server
    - [ ] Try to place an element
    - [ ] Red error message appears at top
    - [ ] Error can be dismissed

11. **Backend API Testing** (Optional - for developers)

Test endpoints directly with curl:

```bash
# Get layout (creates if doesn't exist)
curl http://localhost:3001/api/layouts

# Get all elements
curl http://localhost:3001/api/layouts/elements

# Create an element
curl -X POST http://localhost:3001/api/elements \
  -H "Content-Type: application/json" \
  -d '{
    "element_type": "bay",
    "label": "Bay-001",
    "x_coordinate": 100,
    "y_coordinate": 100,
    "rotation": 0
  }'
```

---

## Troubleshooting

### Issue: "Failed to load data" error on page load

**Cause:** Database connection not configured or migration not run

**Solution:**
1. Check `backend/.env` has correct `DATABASE_URL`
2. Restart backend server
3. Run database migration in Supabase SQL Editor

### Issue: Elements don't save

**Cause:** Backend not running or database connection lost

**Solution:**
1. Check backend terminal - should show "Database connected successfully"
2. Check browser console for API errors
3. Verify backend is running on port 3001

### Issue: Canvas doesn't show or elements don't render

**Cause:** Frontend build issue or dependency problem

**Solution:**
1. Stop frontend server (Ctrl+C)
2. Delete `frontend/.next` folder
3. Run `npm install` in frontend directory
4. Run `npm run dev` again

### Issue: "CORS error" in browser console

**Cause:** Backend CORS_ORIGIN doesn't match frontend URL

**Solution:**
1. Check `backend/.env` has `CORS_ORIGIN=http://localhost:3000`
2. Restart backend server

---

## What's Working

✅ **Complete Features:**
- 3 element types (Bay, Flow Rack, Full Pallet) with correct dimensions
- Click-to-place elements on canvas
- Drag to move elements
- Rotate elements using handles
- Delete selected elements
- Auto-save all changes to PostgreSQL
- Optimistic UI updates (instant feedback)
- Error handling and user feedback
- Responsive canvas (1200×800px)
- Element labeling
- Data persistence across sessions

✅ **Backend API:**
- GET /api/layouts - Get or create user's layout
- PUT /api/layouts - Update layout properties
- GET /api/layouts/elements - Get all elements
- POST /api/elements - Create new element
- PUT /api/elements/:id - Update element
- DELETE /api/elements/:id - Delete element

✅ **Database:**
- PostgreSQL with Supabase
- Proper schema with constraints
- UUIDs for all IDs
- Indexes for performance
- CASCADE deletes

---

## Known Limitations (Future Enhancements)

1. **Label Editing UX** - Double-click label editing needs better UI (input field overlay)
2. **Collision Detection** - Elements can overlap (mentioned as optional by user)
3. **Grid Snapping** - Free positioning (as requested)
4. **Undo/Redo** - Not implemented in MVP
5. **Multi-user** - Mock authentication only, single user for MVP
6. **Element Resizing** - Elements have fixed sizes (as per spec)
7. **Export/Import** - Not in MVP scope

---

## Next Steps (Post-MVP)

After testing the MVP successfully:

1. **Implement real authentication** (JWT, register/login pages)
2. **Add collision detection** (if desired)
3. **Improve label editing UX** (modal or inline input)
4. **Add export to PDF/image** functionality
5. **Implement dataset upload** for heatmap visualization
6. **Build heatmap overlay** with color coding
7. **Add ABC analysis** features

---

## Support

If you encounter issues:

1. Check browser console for errors (F12)
2. Check backend terminal for errors
3. Verify database connection in Supabase dashboard
4. Review `SETUP_INSTRUCTIONS.md` for environment setup
5. Check `CLAUDE.md` for architecture overview
