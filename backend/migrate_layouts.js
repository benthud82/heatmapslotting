
require('dotenv').config();
const { query } = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Attempt to drop the unique constraint on user_id in layouts table
        // We try common constraint names or just alter the table

        // First, let's try to find the constraint name if possible, or just try to drop common names
        // PostgreSQL: ALTER TABLE layouts DROP CONSTRAINT IF EXISTS layouts_user_id_key;

        await query('ALTER TABLE layouts DROP CONSTRAINT IF EXISTS layouts_user_id_key');
        console.log('Dropped layouts_user_id_key if it existed.');

        // Also check if there is a unique index that is not a constraint
        await query('DROP INDEX IF EXISTS layouts_user_id_key');
        console.log('Dropped layouts_user_id_key index if it existed.');

        // Also try "layouts_user_id_idx" just in case
        await query('DROP INDEX IF EXISTS layouts_user_id_idx');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
