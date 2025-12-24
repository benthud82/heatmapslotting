# Item-Level Pick Tracking - Testing Plan

## Test Data Overview

A test CSV file has been created at: `C:\xampp\htdocs\heatmapslotting\test_item_picks.csv`

**Test Data Summary:**
- 12 unique items (SKU-001 through SKU-012)
- 12 unique locations (LOC-A01 through LOC-F02)
- 6 elements (B1, B2, B3, B16, B19, B21)
- 5 days of data (2024-12-01 through 2024-12-05)
- 60 total rows

**Velocity Distribution:**
| Item | Avg Picks/Day | Expected Tier |
|------|--------------|---------------|
| SKU-007 | ~210 | HOT (highest) |
| SKU-003 | ~136 | HOT |
| SKU-012 | ~99 | HOT |
| SKU-005 | ~85 | WARM |
| SKU-010 | ~68 | WARM |
| SKU-001 | ~52 | WARM |
| SKU-009 | ~40 | WARM |
| SKU-011 | ~16 | COLD |
| SKU-002 | ~11 | COLD |
| SKU-006 | ~6 | COLD |
| SKU-004 | ~2 | COLD (lowest) |
| SKU-008 | ~1 | COLD |

---

## Pre-Testing Setup

### 1. Start Both Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Verify Database Connection
- Backend should show: `✅ Database connected successfully`
- No errors in console

---

## Test Cases

### Phase 1: CSV Upload (Backend API)

#### Test 1.1: Upload Item-Level CSV
1. Navigate to the Upload page or use a layout's upload feature
2. Select the `test_item_picks.csv` file
3. **Expected Results:**
   - Format detected as "Item-Level"
   - Shows 60 total rows
   - Shows 12 unique items, 12 unique locations
   - All rows valid (green checkmarks)
   - Upload succeeds with message about items and locations created

#### Test 1.2: Verify Data in Database
Run this command to verify:
```bash
cd backend && node -e "
const pool = require('./db');
async function check() {
  const items = await pool.query('SELECT COUNT(*) FROM items');
  const locs = await pool.query('SELECT COUNT(*) FROM locations');
  const picks = await pool.query('SELECT COUNT(*) FROM item_pick_transactions');
  console.log('Items:', items.rows[0].count);
  console.log('Locations:', locs.rows[0].count);
  console.log('Item Picks:', picks.rows[0].count);
  process.exit(0);
}
check();
"
```
**Expected:** Items: 12, Locations: 12, Item Picks: 60

#### Test 1.3: Re-upload Same Data (Upsert)
1. Upload the same CSV file again
2. **Expected:** No duplicate entries, counts remain the same

---

### Phase 2: Dashboard - Action Board

#### Test 2.1: Item-Level Recommendations Display
1. Go to Dashboard
2. Select a layout with item-level data
3. Look at the Action Board component

**Expected Results:**
- Shows summary stats at top: "Items Analyzed", "Need Reslotting", "ft/day Savings", "min/day Savings"
- "Move Closer" section shows high-velocity items in suboptimal positions
- "Move Further" section shows low-velocity items in prime positions
- Each item shows:
  - Item ID (e.g., SKU-007)
  - Element/Location info
  - Total picks
  - Walk savings (ft/day) for "Move Closer" items

#### Test 2.2: Verify Recommendations Logic
- HOT items (SKU-007, SKU-003, SKU-012) far from cart parking → should be in "Move Closer"
- COLD items (SKU-004, SKU-008) in prime spots → should be in "Move Further"

---

### Phase 3: Dashboard - Velocity Table

#### Test 3.1: View Mode Toggle
1. Go to Velocity Ranking table
2. **Expected:** Toggle button showing "Items" / "Elements"
3. Click "Items" tab

**Expected Results:**
- Table shows columns: #, Item, Location, Picks, Walk Save, Trend, Action
- Shows all 12 items ranked by velocity
- Count badge shows "12 items"

#### Test 3.2: Item View Columns
Each row should display:
- Rank number with tier badge (HOT/WARM/COLD)
- Item ID and description
- Element name and Location ID
- Total picks with avg/day
- Walk savings (ft, min) for items needing reslotting
- Trend indicator
- Action badge (Move Closer, Optimal, Move Further, Review)

#### Test 3.3: Sorting
Test sorting by clicking column headers:
- Sort by Item ID
- Sort by Total Picks
- Sort by Walk Savings
- Sort by Recommendation

#### Test 3.4: Filtering
1. Test tier filter buttons (All, Hot, Warm, Cold)
2. Test search box - search for "SKU-007"
3. **Expected:** Filters work correctly, results update immediately

#### Test 3.5: Switch Back to Elements
1. Click "Elements" toggle
2. **Expected:** Shows element-level aggregated view (legacy data)

---

### Phase 4: Dashboard - Summary Stats

#### Test 4.1: Walk Distance Card
1. Check the Walk Distance card
2. **Expected:** Should calculate distances using item positions

#### Test 4.2: Velocity Distribution
1. Check velocity tier breakdown
2. **Expected:** Pie/bar chart showing Hot/Warm/Cold distribution

---

### Phase 5: Upload Flow Components

#### Test 5.1: CSV Format Guide
1. Navigate to Upload page
2. Check the "File Requirements" section

**Expected:**
- Toggle between "Item-Level (Recommended)" and "Element-Level (Legacy)"
- Item-level shows 5 columns: item_id, location_id, element_name, date, pick_count
- Element-level shows 3 columns: element_name, date, pick_count

#### Test 5.2: Validation Preview
1. Select the test CSV file
2. Check the preview table

**Expected:**
- Shows Item ID, Location ID, Element, Date, Picks columns
- All rows show green "Valid" status

#### Test 5.3: Validation Summary
**Expected:**
- Shows "Item-Level Format" badge
- Shows: Total Rows, Valid Rows, Invalid Rows, Unique Items, Unique Locations
- Success message mentions items and locations

---

### Phase 6: Error Handling

#### Test 6.1: Invalid Element Names
Create a test file with non-existent element:
```csv
item_id,location_id,element_name,date,pick_count
SKU-999,LOC-Z99,NONEXISTENT,2024-12-01,100
```
**Expected:** Warning about unmatched elements

#### Test 6.2: Missing Required Columns
Create a test file missing item_id:
```csv
location_id,element_name,date,pick_count
LOC-A01,B1,2024-12-01,50
```
**Expected:** Error message about missing required columns

#### Test 6.3: Invalid Date Format
```csv
item_id,location_id,element_name,date,pick_count
SKU-001,LOC-A01,B1,12/01/2024,50
```
**Expected:** Row-level error about invalid date format

---

### Phase 7: Backward Compatibility

#### Test 7.1: Element-Level CSV Still Works
Create an element-level CSV:
```csv
element_name,date,pick_count
B1,2024-12-10,500
B2,2024-12-10,300
```
1. Upload this file
2. **Expected:** Detected as "Element-Level Format", uploads successfully

#### Test 7.2: Dashboard Shows Both Data Types
1. Layout with both element and item data
2. **Expected:**
   - Action Board shows item-level recommendations (preferred)
   - Velocity Table has toggle to switch between views
   - Element-level data still accessible

---

### Phase 8: API Endpoints (Optional - For Developers)

Test these endpoints using curl or Postman:

#### Test 8.1: Get Items
```bash
curl http://localhost:3001/api/items?layout_id=YOUR_LAYOUT_ID
```

#### Test 8.2: Get Locations
```bash
curl http://localhost:3001/api/locations?layout_id=YOUR_LAYOUT_ID
```

#### Test 8.3: Get Item Aggregated Picks
```bash
curl http://localhost:3001/api/picks/items/aggregated?layout_id=YOUR_LAYOUT_ID
```

---

## Quick Smoke Test Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] CSV Format Guide shows both formats
- [ ] Upload item-level CSV succeeds
- [ ] Action Board shows item recommendations with walk savings
- [ ] Velocity Table has Items/Elements toggle
- [ ] Item view shows all expected columns
- [ ] Sorting and filtering work
- [ ] Element-level CSV still uploads correctly
- [ ] No JavaScript console errors

---

## Known Limitations

1. **Walk savings require cart parking markers** - If no cart parking is configured on the layout, walk savings will show as 0
2. **Trend calculation** - Requires previous period data to calculate trends
3. **Recommendations depend on element positions** - Elements must have correct x,y coordinates

---

## Cleanup (Optional)

If you want to reset and start fresh:
```sql
-- Run in Supabase SQL Editor
DELETE FROM item_pick_transactions;
DELETE FROM items;
DELETE FROM locations;
-- Optionally also clear element-level picks:
-- DELETE FROM pick_transactions;
```
