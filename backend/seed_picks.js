
require('dotenv').config();
const { query } = require('./db');

async function seed() {
    try {
        console.log('Starting seed...');

        // 1. Find Layout Test
        const layoutRes = await query("SELECT id FROM layouts WHERE name = 'Layout Test' LIMIT 1");
        if (layoutRes.rows.length === 0) {
            throw new Error('Layout Test not found');
        }
        const layoutId = layoutRes.rows[0].id;
        console.log('Found Layout Test:', layoutId);

        // 2. Find any element in this layout
        const elementRes = await query("SELECT id, label FROM warehouse_elements WHERE layout_id = $1 LIMIT 1", [layoutId]);
        if (elementRes.rows.length === 0) {
            throw new Error('No elements found in Layout Test');
        }
        const elementId = elementRes.rows[0].id;
        console.log('Found element:', elementRes.rows[0].label, elementId);

        // 3. Rename element to A-01-01
        await query("UPDATE warehouse_elements SET label = 'A-01-01' WHERE id = $1", [elementId]);
        console.log('Renamed element to A-01-01');

        // 4. Insert picks
        // Delete existing picks for this layout first
        await query("DELETE FROM pick_transactions WHERE layout_id = $1", [layoutId]);

        // Insert some picks
        const picks = [
            { date: '2024-01-15', count: 42 },
            { date: '2024-01-14', count: 30 },
            { date: '2024-01-12', count: 25 }
        ];

        for (const pick of picks) {
            await query(
                `INSERT INTO pick_transactions (layout_id, element_id, pick_date, pick_count) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (element_id, pick_date) 
         DO UPDATE SET pick_count = EXCLUDED.pick_count, created_at = NOW()`,
                [layoutId, elementId, pick.date, pick.count]
            );
        }
        console.log('Inserted picks');

        console.log('Seed completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seed();
