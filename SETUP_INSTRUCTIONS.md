# Setup Instructions

## Environment Variables Setup

### Backend (.env file)
Create `backend/.env` file with the following content:

```
PORT=3001
DATABASE_URL=postgresql://postgres:Dave414!db.simpcbryarzgvbmdingd.supabase.co:5432/postgres
JWT_SECRET=generate-a-random-secret-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**To get your Supabase connection string:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > Database
3. Copy the "Connection string" under "Connection pooling" or "Direct connection"
4. Replace `[YOUR-PASSWORD]` with your database password

**To generate a JWT secret:**
You can use any random string. For example, run this in Node.js:
```javascript
require('crypto').randomBytes(64).toString('hex')
```

### Frontend (.env.local file)
Create `frontend/.env.local` file with the following content:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Supabase Database Setup

1. Sign up/login at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor in your Supabase dashboard
4. Copy and paste the contents of `backend/scripts/migrate.sql`
5. Run the SQL script to create all tables

## Running the Application

### Backend
```bash
cd backend
npm run dev
```

The server will start on http://localhost:3001

### Frontend
```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:3000

## Verification

1. Backend health check: Visit http://localhost:3001/api/health
2. Frontend: Visit http://localhost:3000
3. Check backend console for database connection confirmation

