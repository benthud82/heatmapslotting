# Labor Management System (LMS) - Test Plan

## Prerequisites

1. Database migration must be run in Supabase SQL Editor
2. Backend server running on port 3001
3. Frontend server running on port 3000
4. At least one layout with pick data uploaded

---

## Test 1: Navigation

**Steps:**
1. Navigate to `http://localhost:3000`
2. Look for "Labor" link in the navigation bar

**Expected:** "Labor" link appears in the header navigation between "Dashboard" and user profile

---

## Test 2: Labor Page Access

**Steps:**
1. Click "Labor" in navigation
2. Observe page load

**Expected:**
- Page loads at `/labor`
- Title shows "Labor Management"
- Layout selector dropdown appears in header
- If no layout selected: "No Layout Selected" message
- If layout has no picks: "No Pick Data Yet" message
- If layout has picks: Efficiency Overview card displays

---

## Test 3: Labor Standards Configuration

**Steps:**
1. Go to `/labor` with a layout that has pick data
2. Click "Configure" button on Efficiency Overview card
3. Modal opens with 3 tabs: Time Standards, Allowances, Cost & Shift
4. Change "Pick Time" from 15 to 20 seconds
5. Click "Save Changes"
6. Close modal
7. Refresh page

**Expected:**
- Modal opens with current values
- Changes save successfully (toast or no error)
- After refresh, Configure shows updated values

---

## Test 4: Efficiency Display

**Steps:**
1. Go to `/labor` with a layout that has pick data
2. Observe Efficiency Overview card

**Expected:**
- Total Picks shows count
- Standard Hours shows calculated value
- Walk Distance shows in thousands of feet
- Est. Labor Cost shows dollar amount
- Efficiency gauge displays (may show "—" if no actual hours recorded)
- Time breakdown shows Pick/Walk/Pack/Allowance hours

---

## Test 5: Performance Tracking - Input

**Steps:**
1. Go to `/labor` with a layout that has pick data
2. Find "Record Actual Performance" form
3. Enter:
   - Date: Today
   - Actual Picks: 100
   - Actual Hours: 2
4. Click "Record Performance"

**Expected:**
- Form submits successfully
- Record appears in Efficiency History chart

---

## Test 6: Performance Tracking - History

**Steps:**
1. After recording at least 2 performance entries on different dates
2. Observe Efficiency History chart

**Expected:**
- Bar chart shows entries
- Bars colored green/yellow/red based on efficiency vs target
- Hover shows tooltip with details
- Summary shows Average, Best, and Total Picks

---

## Test 7: Performance Tracking - Delete

**Steps:**
1. Hover over a bar in Efficiency History chart
2. Click "Delete" in tooltip

**Expected:**
- Record is deleted
- Bar disappears from chart

---

## Test 8: Staffing Calculator - Input

**Steps:**
1. Go to `/labor` and find Staffing Calculator card
2. Enter "2500" in Forecasted Picks
3. Wait for calculation (debounced ~500ms)

**Expected:**
- Required headcount displays (large number)
- Labor Hours shows calculated value
- Est. Cost shows dollar amount
- Picks/Person shows ratio
- Utilization shows percentage

---

## Test 9: Staffing Calculator - Quick Scenarios

**Steps:**
1. Click "Light Day" button
2. Observe forecast input updates
3. Click "Average" button
4. Observe forecast input updates
5. Click "Heavy Day" button
6. Observe forecast input updates

**Expected:**
- Light Day: ~70% of average daily picks
- Average: Historical average picks
- Heavy Day: ~150% of average daily picks
- Calculation updates after each selection

---

## Test 10: ROI Simulator - Display

**Steps:**
1. Go to `/labor` with a layout that has reslotting opportunities
2. Observe ROI Simulator card

**Expected:**
- Current State shows daily walk feet/minutes
- After Reslotting shows projected values
- Daily/Weekly/Monthly/Annual savings display
- Implementation section shows items to reslot, time, cost, payback days
- If no reslotting opportunities: "No reslotting recommendations" message

---

## Test 11: ROI Simulator - View Details

**Steps:**
1. Click "View Details" button on ROI Simulator card
2. Modal opens

**Expected:**
- Modal shows summary (Items to Move, Walk Savings, Daily Savings)
- Table lists all recommendations with:
  - Priority number
  - Item ID
  - Current location
  - Recommended location
  - Walk savings
  - Daily savings
- Totals row at bottom

---

## Test 12: ROI Simulator - Export

**Steps:**
1. Click "Export" button on ROI Simulator card
2. Wait for download

**Expected:**
- CSV file downloads
- File named `roi-report-{layoutId}-{date}.csv`
- Contains recommendation data

---

## API Endpoint Tests (via curl or Postman)

### Get Standards
```bash
curl http://localhost:3001/api/layouts/{layoutId}/labor/standards \
  -H "Authorization: Bearer {token}"
```

### Update Standards
```bash
curl -X PUT http://localhost:3001/api/layouts/{layoutId}/labor/standards \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"pick_time_seconds": 20, "hourly_labor_rate": 22}'
```

### Calculate Efficiency
```bash
curl http://localhost:3001/api/layouts/{layoutId}/labor/efficiency \
  -H "Authorization: Bearer {token}"
```

### Calculate Staffing
```bash
curl -X POST http://localhost:3001/api/layouts/{layoutId}/labor/staffing/calculate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"forecastedPicks": 2500, "periodDays": 1}'
```

### Calculate ROI
```bash
curl http://localhost:3001/api/layouts/{layoutId}/labor/roi/calculate \
  -H "Authorization: Bearer {token}"
```

---

## Files Created

### Backend
- `backend/db/migrations/007_labor_management.sql`
- `backend/routes/labor.js`
- `backend/services/laborCalculations.js`

### Frontend
- `frontend/lib/laborApi.ts`
- `frontend/app/labor/page.tsx`
- `frontend/components/labor/LaborConfigModal.tsx`
- `frontend/components/labor/EfficiencyOverviewCard.tsx`
- `frontend/components/labor/EfficiencyGauge.tsx`
- `frontend/components/labor/PerformanceInputForm.tsx`
- `frontend/components/labor/EfficiencyHistoryChart.tsx`
- `frontend/components/labor/StaffingCalculatorCard.tsx`
- `frontend/components/labor/ROISimulatorCard.tsx`
- `frontend/components/labor/ROIDetailModal.tsx`

### Modified
- `backend/server.js` - Added labor routes
- `frontend/components/Header.tsx` - Added "Labor" nav link
