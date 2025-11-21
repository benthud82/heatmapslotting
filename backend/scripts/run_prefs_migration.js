const { query, pool } = require('../db');

const runMigration = async () => {
  try {
    console.log('Running migration for user_preferences table...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
          user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
          skip_upload_tutorial BOOLEAN DEFAULT FALSE,
          successful_uploads_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Table user_preferences created (if not exists).');

    // Add RLS policies
    console.log('Adding RLS policies...');
    
    await query(`ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;`);
    
    // Policy: Users can view their own preferences
    // We use DO blocks or catch errors because policies might already exist
    try {
      await query(`
        CREATE POLICY "Users can view their own preferences" ON user_preferences
        FOR SELECT USING (auth.uid() = user_id);
      `);
    } catch (e) { console.log('Policy view might already exist:', e.message); }

    try {
      await query(`
        CREATE POLICY "Users can insert their own preferences" ON user_preferences
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      `);
    } catch (e) { console.log('Policy insert might already exist:', e.message); }

    try {
      await query(`
        CREATE POLICY "Users can update their own preferences" ON user_preferences
        FOR UPDATE USING (auth.uid() = user_id);
      `);
    } catch (e) { console.log('Policy update might already exist:', e.message); }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
