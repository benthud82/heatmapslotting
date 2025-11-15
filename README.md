# Warehouse Element Placement MVP

A web-based tool for placing and managing warehouse layout elements (bays, flow racks, and full pallets) on a visual canvas.

## 🚀 Quick Start

### 1. Set Up Database

1. Go to [Supabase](https://supabase.com) and create/access your project
2. Copy your database connection string from Settings → Database
3. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://your-connection-string-here
   ```
4. Run the migration:
   - Open Supabase SQL Editor
   - Copy contents of `backend/scripts/migrate.sql`
   - Paste and run in SQL Editor

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:3000

### 4. Open Application

Visit http://localhost:3000 in your browser

---

## 📖 Features

- **Place Elements**: Click to place Bays, Flow Racks, or Full Pallets
- **Move**: Drag elements to reposition
- **Rotate**: Select element and use rotation handles
- **Delete**: Select element and click "Delete Selected"
- **Auto-Save**: All changes save automatically to database
- **Persistent**: Data persists across browser sessions

### Element Types

| Type | Dimensions | Color | Real Size |
|------|-----------|-------|-----------|
| Bay | 24 × 48 px | Blue | 24" × 48" |
| Flow Rack | 120 × 120 px | Green | 120" × 120" |
| Full Pallet | 48 × 52 px | Yellow | 48" × 52" |

*Scale: 1 pixel = 1 inch*

---

## 📁 Documentation

- **[MVP_SUMMARY.md](./MVP_SUMMARY.md)** - Complete implementation details
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Step-by-step testing instructions
- **[CLAUDE.md](./CLAUDE.md)** - Architecture reference for Claude Code
- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Detailed environment setup
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Implementation plan & next features

---

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- PostgreSQL (Supabase)
- JWT authentication (mock for MVP)

### Frontend
- Next.js 14 (App Router)
- React + TypeScript
- react-konva (canvas rendering)
- Tailwind CSS

---

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing checklist.

**Quick Test:**
1. Select "Bay" button
2. Click on canvas → Blue rectangle appears
3. Drag rectangle → Moves smoothly
4. Select rectangle → Rotation handles appear
5. Refresh page → Rectangle persists

---

## 🐛 Troubleshooting

### Database Connection Error

**Problem:** `getaddrinfo ENOTFOUND` or database connection failed

**Solution:**
1. Check `backend/.env` has correct `DATABASE_URL`
2. Verify Supabase project is active
3. Run database migration in Supabase SQL Editor
4. Restart backend server

### CORS Error

**Problem:** Frontend can't connect to backend

**Solution:**
1. Verify `backend/.env` has `CORS_ORIGIN=http://localhost:3000`
2. Restart backend server

### Elements Don't Save

**Problem:** Elements disappear on page refresh

**Solution:**
1. Check backend terminal for database errors
2. Check browser console for API errors
3. Verify backend is running
4. Verify database migration was run

---

## 📦 Project Structure

```
heatmapslotting/
├── backend/              # Node.js/Express API
│   ├── db/              # Database connection
│   ├── middleware/      # Auth middleware (mock)
│   ├── routes/          # API endpoints
│   │   ├── layouts.js   # Layout management
│   │   └── bays.js      # Element operations
│   ├── scripts/
│   │   └── migrate.sql  # Database schema
│   └── server.js        # Express app
│
├── frontend/            # Next.js app
│   ├── app/
│   │   └── page.tsx     # Main application
│   ├── components/
│   │   ├── ElementToolbar.tsx
│   │   └── WarehouseCanvas.tsx
│   └── lib/
│       ├── api.ts       # API client
│       └── types.ts     # TypeScript types
│
└── docs/                # Documentation
    ├── README.md        # This file
    ├── MVP_SUMMARY.md
    ├── TESTING_GUIDE.md
    └── CLAUDE.md
```

---

## 🎯 MVP Scope

**Included ✅**
- 3 element types (Bay, Flow Rack, Full Pallet)
- Click-to-place elements
- Drag to move
- Rotate elements
- Delete elements
- Auto-save to database
- Single auto-saving layout

**Not Included (Future) 📅**
- User authentication (using mock)
- Multiple layouts
- Collision detection
- Undo/redo
- Export to PDF
- Heatmap visualization
- Dataset upload

See original `warehouse-slotting-mvp-spec.md` for future roadmap.

---

## 🔧 Development

### Backend Commands
```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Production server
```

### Frontend Commands
```bash
npm run dev    # Development server
npm run build  # Production build
npm start      # Production server
npm run lint   # Run ESLint
```

### API Endpoints
```
GET    /api/health               # Health check
GET    /api/layouts              # Get/create layout
PUT    /api/layouts              # Update layout
GET    /api/layouts/elements     # Get all elements
POST   /api/elements             # Create element
PUT    /api/elements/:id         # Update element
DELETE /api/elements/:id         # Delete element
```

---

## 📝 License

Proprietary - Warehouse Slotting Solutions

---

## 🆘 Support

For issues or questions:
1. Check [TESTING_GUIDE.md](./TESTING_GUIDE.md)
2. Review browser console (F12)
3. Check backend terminal for errors
4. Verify database connection in Supabase

---

## ✅ Status

**MVP Complete** - Ready for testing and deployment!

See [MVP_SUMMARY.md](./MVP_SUMMARY.md) for complete implementation details.
