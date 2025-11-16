const { Pool } = require('pg');
require('dotenv').config();

// Supabase requires SSL for all connections (development and production)
// Try to detect if this is a Supabase connection
const isSupabase = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('supabase.co') || 
  process.env.DATABASE_URL.includes('pooler.supabase.com')
);

// Use SSL for Supabase, or if explicitly set in production
const sslConfig = isSupabase 
  ? { rejectUnauthorized: false }  // Supabase requires SSL
  : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};

