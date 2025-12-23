const { Pool } = require('pg');
require('dotenv').config();

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please create a .env file in the backend directory with your DATABASE_URL.');
  process.exit(1);
}

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

// Helper to redact password from connection string for logging
const redactConnectionString = (url) => {
  if (!url) return 'not set';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch {
    // If URL parsing fails, just show first part
    const match = url.match(/^([^:]+:\/\/[^:]+:)[^@]+(@.+)$/);
    return match ? `${match[1]}***${match[2]}` : '***';
  }
};

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

    // Only log in development, truncate query text
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: res.rowCount
      });
    }

    return res;
  } catch (error) {
    // Log errors but redact query details in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Query error', { error: error.message });
    } else {
      console.error('Query error', { text, error: error.message });
    }
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📍 Connection string:', redactConnectionString(process.env.DATABASE_URL));
    
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    
    // Provide helpful error messages for common Supabase errors
    if (error.message.includes('Tenant or user not found')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Verify your DATABASE_URL in the .env file is correct');
      console.error('   2. Check that your Supabase password doesn\'t contain special characters');
      console.error('   3. If your password has special characters (!, @, #, $, etc.), URL-encode them:');
      console.error('      - ! becomes %21');
      console.error('      - @ becomes %40');
      console.error('      - # becomes %23');
      console.error('      - $ becomes %24');
      console.error('   4. Get your connection string from: Supabase Dashboard > Settings > Database > Connection string');
      console.error('   5. Make sure you\'re using the "Connection pooling" connection string, not "Direct connection"');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 The database password is incorrect. Please check your DATABASE_URL.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Cannot reach the database server. Check your network connection and DATABASE_URL hostname.');
    }
    
    return false;
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};

