# User Testing Guide - Designer Page New Features

**Version:** 1.0
**Last Updated:** 2025-12-25
**Features Under Test:** Template Library, Drag-Drop Sidebar, Image Import, DXF/CAD Import

---

## Overview

This document outlines comprehensive test scenarios for the four new deployment-acceleration features added to the Warehouse Designer page. These features were designed to reduce layout creation time from hours to minutes.

**Testing Environment Requirements:**
- Modern browser (Chrome, Firefox, Safari, Edge)
- Active internet connection
- Valid user account (free, pro, or enterprise tier)
- Sample files for testing:
  - Test images (PNG, JPG, PDF) of warehouse layouts
  - Test DXF files (AutoCAD format)

---

## Feature 1: Warehouse Template Library

### Purpose
Pre-built warehouse layouts that users can apply instantly instead of starting from a blank canvas.

### Test Scenarios

#### TC-TL-001: Open Template Library
**Steps:**
1. Navigate to Designer page
2. Click "Templates" button in the toolbar (blue gradient button near top)

**Expected Result:**
- Modal opens with title "Warehouse Templates"
- 5 templates displayed with visual thumbnails:
  - U-Shaped Warehouse
  - I-Shaped Warehouse (Straight-Line)
  - L-Shaped Warehouse
  - Flow Rack Zone Module
  - Pallet Storage Grid
- Each template shows icon, name, description, and element count

**Pass Criteria:** ✅ Modal opens, all 5 templates visible

---

#### TC-TL-002: Preview Template Details
**Steps:**
1. Open Template Library (TC-TL-001)
2. Hover over each template card

**Expected Result:**
- Hover state shows blue border and slight elevation
- Template metadata visible:
  - Number of elements (e.g., "48 elements")
  - Category badge (Full Warehouse or Zone)
  - Brief description

**Pass Criteria:** ✅ All templates show complete information

---

#### TC-TL-003: Apply Template - U-Shaped Warehouse
**Steps:**
1. Open Template Library
2. Click "Use Template" on U-Shaped Warehouse
3. Observe canvas

**Expected Result:**
- Modal closes immediately
- Canvas displays complete U-shaped layout:
  - Receiving dock area (top-left)
  - Storage racks (center)
  - Shipping area (bottom-right)
  - Flow racks along the sides
- Route markers placed:
  - Start point (green) at receiving
  - Cart parking (blue) markers in aisles
  - Stop point (red) at shipping
- Success toast: "Applied 'U-Shaped Warehouse' template (X elements, Y markers)"
- All new elements are loaded on canvas
- Elements are properly positioned and labeled

**Pass Criteria:** ✅ Layout matches template thumbnail, all elements present

---

#### TC-TL-004: Apply Template - I-Shaped Warehouse
**Steps:**
1. Open Template Library
2. Click "Use Template" on I-Shaped Warehouse
3. Observe canvas

**Expected Result:**
- Straight-line flow layout appears
- Receiving → Storage → Picking → Shipping in linear progression
- Elements aligned in rows
- Route markers follow linear path

**Pass Criteria:** ✅ Linear layout with proper flow direction

---

#### TC-TL-005: Apply Template - L-Shaped Warehouse
**Steps:**
1. Open Template Library
2. Click "Use Template" on L-Shaped Warehouse
3. Observe canvas

**Expected Result:**
- L-shaped configuration with corner dock
- Storage in two perpendicular sections
- Proper spacing and labels

**Pass Criteria:** ✅ L-shape visible with corner orientation

---

#### TC-TL-006: Apply Zone Template - Flow Rack Module
**Steps:**
1. Open Template Library
2. Click "Use Template" on Flow Rack Zone Module
3. Observe canvas

**Expected Result:**
- 20 flow racks arranged in pick module configuration
- Proper aisle spacing (96" between rows)
- Sequential labeling (FR1, FR2, FR3...)
- Zone fits in ~400x400 area

**Pass Criteria:** ✅ Flow racks in organized grid, proper spacing

---

#### TC-TL-007: Apply Zone Template - Pallet Storage Grid
**Steps:**
1. Open Template Library
2. Click "Use Template" on Pallet Storage Grid
3. Observe canvas

**Expected Result:**
- 40 pallet positions in 4x10 grid
- Vertical aisles between columns
- Sequential labeling (P1, P2, P3...)

**Pass Criteria:** ✅ Grid layout with aisles, proper labels

---

#### TC-TL-008: Template + Existing Elements (Additive)
**Steps:**
1. Manually create 5 elements on canvas (any type)
2. Open Template Library
3. Apply any template

**Expected Result:**
- Existing elements remain on canvas
- Template elements are ADDED (not replaced)
- Total element count = original 5 + template elements
- No elements overlap unless coincidentally positioned

**Pass Criteria:** ✅ Additive behavior, existing work preserved

---

#### TC-TL-009: Element Limit Warning - Free Tier
**Precondition:** User on Free tier (50 element limit), canvas has 40 elements

**Steps:**
1. Open Template Library
2. Attempt to apply U-Shaped Warehouse (48 elements)
3. Observe warning

**Expected Result:**
- Warning message appears in modal:
  - "Warning: Importing 48 elements would exceed your limit of 50."
- User can still click "Use Template"
- If applied, only first 10 elements are created (to reach limit)
- Error appears: "Element limit reached. Upgrade to Pro for 500 elements."

**Pass Criteria:** ✅ Warning shown, limit enforced

---

#### TC-TL-010: Cancel Template Selection
**Steps:**
1. Open Template Library
2. Click "Cancel" button or click outside modal

**Expected Result:**
- Modal closes
- No elements added to canvas
- Canvas state unchanged

**Pass Criteria:** ✅ Clean cancellation, no side effects

---

### Edge Cases - Template Library

#### TC-TL-E01: Rapid Multiple Template Applications
**Steps:**
1. Apply U-Shaped template
2. Immediately apply I-Shaped template (before first finishes)
3. Observe canvas and network requests

**Expected Result:**
- Both templates load sequentially
- No race conditions or duplicate elements
- Final canvas contains elements from both templates

**Pass Criteria:** ✅ No errors, both templates applied

---

#### TC-TL-E02: Template Application During Save
**Steps:**
1. Create an element manually (triggers auto-save)
2. While "Saving..." indicator is active, apply a template

**Expected Result:**
- Template waits for save to complete
- No data loss or conflicts
- All elements persist after page refresh

**Pass Criteria:** ✅ No conflicts, data integrity maintained

---

## Feature 2: Drag-Drop Element Sidebar

### Purpose
Intuitive drag-and-drop interface for placing elements directly onto the canvas, similar to Figma/Lucidchart.

### Test Scenarios

#### TC-DD-001: Identify Draggable Elements
**Steps:**
1. Navigate to Designer page
2. Observe left sidebar

**Expected Result:**
- Sidebar shows hint text: "Click or drag to canvas"
- 6 element tools with icons:
  - Select (V)
  - Bay (24"×48")
  - Flow Rack (120"×120")
  - Pallet (48"×52")
  - Text Label
  - Line
  - Arrow
- 3 route marker tools:
  - Start Point (green indicator)
  - Stop Point (red indicator)
  - Cart Parking (blue indicator)
- All draggable tools show cursor: grab
- Color indicator dots/bars visible on icons

**Pass Criteria:** ✅ Visual affordances for drag functionality

---

#### TC-DD-002: Drag Bay Element to Canvas
**Steps:**
1. Click and hold "Bay" button in sidebar
2. Drag cursor over canvas area
3. Release mouse button

**Expected Result:**
- Custom drag preview appears (60x40px blue rectangle with "B")
- Cursor shows copy effect
- On drop:
  - Bay element created at drop position
  - Label: "B[N]" (e.g., B1, B2, B3)
  - Dimensions: 24"×48"
  - Success toast: "Created Bay" (1.5 seconds)
- Element appears on canvas immediately
- No need to click again to place

**Pass Criteria:** ✅ Smooth drag, element created at drop position

---

#### TC-DD-003: Drag Flow Rack to Canvas
**Steps:**
1. Drag "Flow Rack" button from sidebar to canvas
2. Drop at specific position (e.g., 300, 200)

**Expected Result:**
- Flow rack created at drop coordinates
- Label: "FR[N]" (e.g., FR1)
- Dimensions: 120"×120"
- Green color (#10b981)

**Pass Criteria:** ✅ Flow rack placed accurately

---

#### TC-DD-004: Drag Pallet to Canvas
**Steps:**
1. Drag "Pallet" button from sidebar to canvas
2. Drop at position

**Expected Result:**
- Pallet created at drop position
- Label: "P[N]"
- Dimensions: 48"×52"
- Orange color (#f59e0b)

**Pass Criteria:** ✅ Pallet placed correctly

---

#### TC-DD-005: Drag Text Label to Canvas
**Steps:**
1. Drag "Text Label" button to canvas
2. Drop at position

**Expected Result:**
- Text element created
- Label: "T[N]"
- Small size (can be edited)

**Pass Criteria:** ✅ Text element placed

---

#### TC-DD-006: Drag Line to Canvas
**Steps:**
1. Drag "Line" button to canvas
2. Drop at position

**Expected Result:**
- Line element created
- Label: "L[N]"
- Horizontal line (can be rotated)

**Pass Criteria:** ✅ Line element placed

---

#### TC-DD-007: Drag Arrow to Canvas
**Steps:**
1. Drag "Arrow" button to canvas
2. Drop at position

**Expected Result:**
- Arrow element created
- Label: "A[N]"
- Directional arrow shape

**Pass Criteria:** ✅ Arrow element placed

---

#### TC-DD-008: Drag Start Point Marker
**Steps:**
1. Drag "Start Point" button from Route section
2. Drop onto canvas

**Expected Result:**
- Green circle marker created
- Label: "Start" (first one) or "Start 2", "Start 3", etc.
- Position: exact drop coordinates
- Success toast: "Start placed"

**Pass Criteria:** ✅ Start marker placed with proper styling

---

#### TC-DD-009: Drag Stop Point Marker
**Steps:**
1. Drag "Stop Point" button from Route section
2. Drop onto canvas

**Expected Result:**
- Red square marker created
- Label: "Stop" or "Stop 2", "Stop 3"
- Success toast: "Stop placed"

**Pass Criteria:** ✅ Stop marker placed

---

#### TC-DD-010: Drag Cart Parking Marker
**Steps:**
1. Drag "Cart Parking" button from Route section
2. Drop onto canvas

**Expected Result:**
- Blue cart icon marker created
- Label: "Cart" or "Cart 2", "Cart 3"
- Sequence order assigned (1, 2, 3...)
- Success toast: "Cart placed"

**Pass Criteria:** ✅ Cart marker with sequence number

---

#### TC-DD-011: Click-to-Place Still Works (Backward Compatibility)
**Steps:**
1. Click "Bay" button in sidebar (do NOT drag)
2. Click on canvas at desired position

**Expected Result:**
- Bay element created at click position
- Same behavior as before drag-drop was added
- Tool remains active for multiple placements

**Pass Criteria:** ✅ Click-to-place mode still functional

---

#### TC-DD-012: Drag Outside Canvas (Cancel)
**Steps:**
1. Start dragging "Bay" button
2. Drag cursor outside canvas area (e.g., over sidebar or properties panel)
3. Release mouse

**Expected Result:**
- No element created
- No error messages
- Cursor returns to normal

**Pass Criteria:** ✅ Graceful cancellation, no element placed

---

#### TC-DD-013: Multiple Rapid Drags
**Steps:**
1. Drag Bay to canvas, drop at (100, 100)
2. Immediately drag Flow Rack, drop at (200, 100)
3. Immediately drag Pallet, drop at (300, 100)
4. Observe without pausing

**Expected Result:**
- All 3 elements created in rapid succession
- Each at correct position
- Proper sequential labels: B1, FR1, P1
- No lag or dropped events
- All elements saved to backend

**Pass Criteria:** ✅ All elements created, no race conditions

---

#### TC-DD-014: Drag with Zoom Active
**Steps:**
1. Set canvas zoom to 150%
2. Drag Bay element to canvas
3. Drop at visual position (300, 200)

**Expected Result:**
- Element created at correct position accounting for zoom
- Position matches where element was visually dropped
- No offset errors

**Pass Criteria:** ✅ Accurate placement at any zoom level

---

#### TC-DD-015: Drag-Drop vs. Select Tool
**Steps:**
1. Ensure "Select" tool is active (default)
2. Drag Bay element to canvas

**Expected Result:**
- Element is created
- Select tool remains active after drop
- User can immediately click and drag the new element to reposition

**Pass Criteria:** ✅ Select tool not changed by drag-drop

---

### Edge Cases - Drag-Drop

#### TC-DD-E01: Drag During Auto-Save
**Steps:**
1. Create element manually to trigger save
2. While "Saving..." indicator shows, drag new element to canvas

**Expected Result:**
- Drop is queued until save completes
- No data conflicts
- Both elements saved successfully

**Pass Criteria:** ✅ No errors, proper sequencing

---

#### TC-DD-E02: Drag Beyond Element Limit
**Precondition:** Free tier user at 49/50 elements

**Steps:**
1. Drag Bay to canvas

**Expected Result:**
- Element created successfully (reaches limit)
- Status bar shows "50/50 elements"
- Next drag attempt shows error: "Element limit reached. Upgrade to Pro for 500 elements."
- No element created on second drag

**Pass Criteria:** ✅ Limit enforced, clear error message

---

#### TC-DD-E03: Simultaneous Drag Attempts (Multi-Touch)
**Note:** Test on touch device or multi-input setup

**Steps:**
1. Start dragging Bay element (hold but don't release)
2. With second input, drag Flow Rack simultaneously
3. Drop both

**Expected Result:**
- System handles gracefully
- At least one element created
- No crashes or undefined behavior

**Pass Criteria:** ✅ No errors, graceful handling

---

## Feature 3: Image Import Background Trace

### Purpose
Users can import a photo/image of their existing warehouse and trace over it to quickly create a digital layout.

### Test Scenarios

#### TC-IMG-001: Locate Import Image Button
**Steps:**
1. Navigate to Designer page
2. Locate toolbar at top

**Expected Result:**
- "Import Image" button visible next to "Templates" button
- Icon shows image/photo symbol
- Gray/slate styling (not blue like Templates)

**Pass Criteria:** ✅ Button visible and accessible

---

#### TC-IMG-002: Import PNG Image
**Steps:**
1. Click "Import Image" button
2. File picker opens
3. Select a PNG warehouse floor plan (any resolution)
4. Click Open

**Expected Result:**
- File picker shows only image files (filtered)
- After selection:
  - Image loads as background layer on canvas
  - Image positioned at (0, 0) - top-left
  - Image scales to fit canvas proportions
  - Default opacity: 50% (semi-transparent)
  - Success toast: "Background image loaded - trace your layout!"
  - Image appears BEHIND all elements (lowest z-index)
  - Image cannot be selected or moved

**Pass Criteria:** ✅ Image loads as locked background layer

---

#### TC-IMG-003: Import JPG Image
**Steps:**
1. Click "Import Image" button
2. Select a JPG warehouse photo
3. Observe canvas

**Expected Result:**
- Same behavior as PNG (TC-IMG-002)
- JPG loaded successfully as background
- No quality loss or artifacts

**Pass Criteria:** ✅ JPG loads correctly

---

#### TC-IMG-004: Import Large Image (>5MB)
**Steps:**
1. Select a high-resolution warehouse image (5-10MB)
2. Import via "Import Image" button

**Expected Result:**
- Image loads (may take 2-3 seconds)
- Loading state visible (optional)
- Image displays at full quality
- Canvas performance remains smooth

**Pass Criteria:** ✅ Large images handled gracefully

---

#### TC-IMG-005: Adjust Opacity Slider
**Precondition:** Background image loaded

**Steps:**
1. Locate opacity slider (appears only when image is loaded)
2. Drag slider from 50% to 100%
3. Drag slider to 10%
4. Observe image visibility

**Expected Result:**
- Opacity slider appears next to Import Image button
- Label shows "Opacity: [X%]"
- Range: 10% to 100% in 10% increments
- Image transparency updates in real-time as slider moves
- At 100%: Image fully opaque
- At 10%: Image very faint, elements clearly visible on top

**Pass Criteria:** ✅ Opacity adjusts smoothly, real-time feedback

---

#### TC-IMG-006: Trace Over Background Image
**Precondition:** Warehouse photo loaded as background

**Steps:**
1. Set opacity to 40% for visibility
2. Use Bay tool to trace racks visible in photo
3. Place 5-10 bays over photo areas
4. Adjust bay positions to match photo

**Expected Result:**
- Elements can be placed directly over background image
- Background does not interfere with element placement
- Elements remain selectable and draggable
- User can align elements with photo features (walls, racks, aisles)
- Background image stays fixed (doesn't move when dragging elements)

**Pass Criteria:** ✅ Clean tracing workflow, no interference

---

#### TC-IMG-007: Toggle Image Visibility with Opacity
**Precondition:** Background image loaded, elements traced on canvas

**Steps:**
1. Drag opacity slider to 10% (minimum)
2. Observe layout
3. Drag opacity to 100%
4. Observe layout

**Expected Result:**
- At 10%: Background barely visible, elements stand out
- At 100%: Background fully visible, elements overlay
- User can toggle to verify alignment

**Pass Criteria:** ✅ Opacity toggle useful for verification

---

#### TC-IMG-008: Remove Background Image
**Precondition:** Background image loaded

**Steps:**
1. Click "X" (remove) button next to opacity slider
2. Observe canvas

**Expected Result:**
- Background image disappears immediately
- Opacity slider and remove button hide
- All traced elements remain on canvas
- Canvas returns to default dark background
- Info toast: "Background image removed"

**Pass Criteria:** ✅ Image removed cleanly, elements preserved

---

#### TC-IMG-009: Replace Background Image
**Precondition:** Background image already loaded

**Steps:**
1. Click "Import Image" button again
2. Select a different image file
3. Observe canvas

**Expected Result:**
- New image replaces old image
- Opacity resets to 50%
- Existing elements remain unchanged
- Success toast: "Background image loaded - trace your layout!"

**Pass Criteria:** ✅ Image replacement works, elements safe

---

#### TC-IMG-010: Background Persistence Across Layout Changes
**Precondition:** Background image loaded on Layout A

**Steps:**
1. Switch to Layout B (using Layout Manager dropdown)
2. Observe canvas
3. Switch back to Layout A

**Expected Result:**
- Layout B has NO background image (each layout independent)
- When returning to Layout A, background image is GONE (not persisted)
- Note: Background images are session-only, not saved to database

**Pass Criteria:** ✅ Background is session-only, not persisted

---

#### TC-IMG-011: Export Canvas with Background Image
**Precondition:** Background image loaded, opacity 40%

**Steps:**
1. Click File → Export PNG
2. Save exported file
3. Open exported PNG

**Expected Result:**
- Exported image includes:
  - Background trace image (at current opacity)
  - All elements drawn on top
- Export matches what user sees on canvas

**Pass Criteria:** ✅ Export includes background image

---

#### TC-IMG-012: Unsupported File Type
**Steps:**
1. Click "Import Image" button
2. Attempt to select a PDF or other non-image file (if file picker allows)

**Expected Result:**
- File picker should filter to image types only (PNG, JPG, JPEG, GIF, WebP)
- If non-image selected somehow:
  - Error message: "Please select an image file (PNG, JPG, etc.)"
  - No image loaded

**Pass Criteria:** ✅ Only image files accepted

---

### Edge Cases - Image Import

#### TC-IMG-E01: Extremely Large Image (>20MB)
**Steps:**
1. Import a very high-resolution image (e.g., 8000×6000px, 25MB)

**Expected Result:**
- Image loads but may take 5-10 seconds
- Browser memory usage increases
- Canvas remains responsive
- Consider: Warning for files >10MB

**Pass Criteria:** ✅ No crash, performance acceptable

---

#### TC-IMG-E02: Corrupted Image File
**Steps:**
1. Attempt to import a corrupted/truncated image file

**Expected Result:**
- Error message: "Failed to load image"
- No background image appears
- Canvas state unchanged

**Pass Criteria:** ✅ Graceful error handling

---

#### TC-IMG-E03: Background with High Zoom
**Steps:**
1. Load background image
2. Zoom canvas to 300%
3. Observe image quality

**Expected Result:**
- Background scales with canvas zoom
- May appear pixelated at high zoom (expected)
- No rendering errors

**Pass Criteria:** ✅ Background scales correctly

---

## Feature 4: DXF/CAD Import

### Purpose
Import existing warehouse layouts from AutoCAD DXF files, converting CAD entities to canvas elements.

### Test Scenarios

#### TC-DXF-001: Locate Import DXF Button
**Steps:**
1. Navigate to Designer page
2. Locate toolbar

**Expected Result:**
- "Import DXF" button visible next to "Import Image" button
- Icon shows document/file symbol
- Gray/slate styling

**Pass Criteria:** ✅ Button visible

---

#### TC-DXF-002: Open DXF Import Modal
**Steps:**
1. Click "Import DXF" button

**Expected Result:**
- Modal opens with title "Import DXF/CAD File"
- Subtitle: "Import warehouse layouts from AutoCAD DXF files"
- Drag-drop zone displayed:
  - Dashed border
  - File icon
  - Text: "Drop your DXF file here"
  - "or" divider
  - "Browse Files" button
  - Support note: "Supports AutoCAD DXF format"
- Footer shows: "Select a DXF file to preview"

**Pass Criteria:** ✅ Modal opens with upload interface

---

#### TC-DXF-003: Import Simple DXF - LINE Entities
**Test File:** DXF with 10 LINE entities

**Steps:**
1. Open DXF Import modal
2. Click "Browse Files" or drag DXF file into drop zone
3. Wait for processing
4. Observe preview

**Expected Result:**
- Processing indicator appears briefly
- Preview section displays:
  - **Total Entities:** 10
  - **Converted:** 10 (green)
  - **Skipped:** 0
- Element preview shows:
  - L1, L2, L3... L10 (line labels)
  - Small colored dots next to labels
- No warnings
- "Import Elements" button enabled (blue)
- Footer shows: "Ready to import 10 elements"

**Pass Criteria:** ✅ Lines parsed, preview accurate

---

#### TC-DXF-004: Import DXF - LWPOLYLINE Entities
**Test File:** DXF with LWPOLYLINE rectangles (representing racks)

**Steps:**
1. Import DXF file with 20 LWPOLYLINE entities
2. Observe preview

**Expected Result:**
- Polylines converted to warehouse elements based on size:
  - Large rectangles (>80"×80") → Flow Racks (FR1, FR2...)
  - Medium rectangles (30-80") → Pallets (P1, P2...)
  - Small rectangles (<30") → Bays (B1, B2...)
- Preview shows mixed element types
- Converted count matches entities

**Pass Criteria:** ✅ Polylines intelligently categorized

---

#### TC-DXF-005: Import DXF - TEXT Entities
**Test File:** DXF with TEXT/MTEXT labels

**Steps:**
1. Import DXF with text annotations (e.g., "Aisle A", "Zone 1")
2. Observe preview

**Expected Result:**
- Text entities converted to text elements
- Labels preserve original text content (truncated to 50 chars if needed)
- Text elements shown in preview

**Pass Criteria:** ✅ Text content preserved

---

#### TC-DXF-006: Import Mixed DXF (Real Warehouse Layout)
**Test File:** Complex DXF with lines, polylines, text, circles

**Steps:**
1. Import a realistic warehouse CAD file (50-100 entities)
2. Wait for processing (may take 2-3 seconds)
3. Review preview stats

**Expected Result:**
- Stats displayed:
  - **Total Entities:** 85 (example)
  - **Converted:** 62
  - **Skipped:** 23
- Preview shows first 20 elements (e.g., B1, FR1, P1, L1...)
- If >20 elements: "+X more..." shown
- Warnings section may appear:
  - "Skipped 15 CIRCLE entities (not supported)"
  - "Skipped 8 INSERT blocks (not supported)"
- "Import Elements" button enabled

**Pass Criteria:** ✅ Complex file handled, clear stats

---

#### TC-DXF-007: Import DXF to Canvas
**Precondition:** DXF file processed, preview shows 30 elements

**Steps:**
1. Review preview in modal
2. Click "Import Elements" button
3. Observe canvas

**Expected Result:**
- Modal closes immediately
- Canvas updates:
  - 30 new elements appear
  - Elements positioned and scaled to fit canvas (auto-scaled)
  - Elements centered with padding (~100px margins)
  - All new elements selected (blue outline)
- Success toast: "Imported 30 elements from DXF file"
- Status bar updates element count

**Pass Criteria:** ✅ Elements imported, visible, selectable

---

#### TC-DXF-008: DXF Coordinate Scaling
**Test File:** DXF in millimeters (typical CAD units), 10000mm × 8000mm layout

**Steps:**
1. Import DXF
2. Observe canvas element positions

**Expected Result:**
- DXF coordinates automatically scaled to fit 1200×800 canvas
- Scale calculation:
  - Maintains aspect ratio
  - Fits within target size with 80% padding
  - Offsets to center layout
- Elements not cut off or out of bounds

**Pass Criteria:** ✅ Layout scaled to fit canvas properly

---

#### TC-DXF-009: DXF Import - Invalid File
**Steps:**
1. Open DXF Import modal
2. Select a non-DXF file (e.g., .txt, .jpg, .pdf)

**Expected Result:**
- File picker filters to .dxf files
- If wrong file selected:
  - Error message (red): "Please drop a .dxf file"
  - No processing occurs

**Pass Criteria:** ✅ Only DXF files accepted

---

#### TC-DXF-010: DXF Import - Corrupt DXF
**Test File:** Malformed DXF file

**Steps:**
1. Import corrupted DXF file

**Expected Result:**
- Error message: "Invalid DXF file format. Please select a valid AutoCAD DXF file."
- No elements shown in preview
- "Import Elements" button disabled

**Pass Criteria:** ✅ Validation error shown

---

#### TC-DXF-011: DXF Import - Empty DXF
**Test File:** Valid DXF with 0 entities

**Steps:**
1. Import empty DXF file

**Expected Result:**
- Stats show:
  - **Total Entities:** 0
  - **Converted:** 0
  - **Skipped:** 0
- Warning: "No compatible entities found in DXF file. Try a file with LWPOLYLINE, LINE, or TEXT entities."
- "Import Elements" button disabled

**Pass Criteria:** ✅ Empty file handled gracefully

---

#### TC-DXF-012: DXF Import - Exceed Element Limit
**Precondition:** Free tier user with 45/50 elements on canvas

**Steps:**
1. Import DXF with 20 elements
2. Observe preview

**Expected Result:**
- Preview shows all 20 elements
- Warning message appears:
  - "Warning: Importing 20 elements would exceed your limit of 50."
- User can still click "Import Elements"
- On import:
  - Only 5 elements created (to reach 50 limit)
  - Error toast: "Element limit reached. Upgrade to Pro for 500 elements."
  - Remaining 15 elements not imported

**Pass Criteria:** ✅ Limit warning shown, partial import handled

---

#### TC-DXF-013: DXF Label Preservation
**Test File:** DXF where polylines are in blocks with labels (e.g., "Rack-A1")

**Steps:**
1. Import DXF
2. Check element labels on canvas

**Expected Result:**
- Elements have auto-generated labels (B1, FR1, P1...)
- Original DXF labels not preserved (limitation)
- Labels follow sequential numbering
- User can manually rename after import

**Pass Criteria:** ✅ Elements labeled sequentially

---

#### TC-DXF-014: DXF Import - Multiple Files Sequential
**Steps:**
1. Import DXF File A (15 elements)
2. Wait for import to complete
3. Open DXF Import modal again
4. Import DXF File B (10 elements)

**Expected Result:**
- File A elements remain on canvas
- File B elements added (not replaced)
- Total: 25 elements
- Labels continue sequence (e.g., if File A ended with B15, File B starts with B16)

**Pass Criteria:** ✅ Multiple imports additive

---

#### TC-DXF-015: Cancel DXF Import
**Steps:**
1. Open DXF Import modal
2. Select and process a DXF file
3. Review preview
4. Click "Cancel" button

**Expected Result:**
- Modal closes
- No elements added to canvas
- Canvas state unchanged

**Pass Criteria:** ✅ Clean cancellation

---

#### TC-DXF-016: Try Another File After Processing
**Steps:**
1. Import and process DXF File A
2. In preview, click "Try another file" link
3. Observe modal

**Expected Result:**
- Preview clears
- Upload zone reappears
- User can drag/browse new file
- Previous file preview discarded

**Pass Criteria:** ✅ Can select different file before importing

---

### Edge Cases - DXF Import

#### TC-DXF-E01: Extremely Large DXF (1000+ Entities)
**Steps:**
1. Import complex warehouse DXF with 1000+ entities

**Expected Result:**
- Processing takes 5-10 seconds
- "Processing DXF file..." spinner visible
- Preview shows first 20 converted elements
- "+980 more..." indicator
- Import button functional
- Browser remains responsive

**Pass Criteria:** ✅ Large files processed, no freeze

---

#### TC-DXF-E02: DXF with Unsupported Entities Only
**Test File:** DXF with only CIRCLE, ARC, ELLIPSE entities

**Steps:**
1. Import DXF

**Expected Result:**
- All entities skipped
- Stats:
  - **Total:** 50
  - **Converted:** 0
  - **Skipped:** 50
- Warning: "No compatible entities found in DXF file. Try a file with LWPOLYLINE, LINE, or TEXT entities."
- Import button disabled

**Pass Criteria:** ✅ Clear message, no crash

---

#### TC-DXF-E03: DXF Import During Save
**Steps:**
1. Manually create element (triggers save)
2. While saving, import DXF

**Expected Result:**
- Import waits for save to complete
- No data conflicts
- All elements saved successfully

**Pass Criteria:** ✅ No race conditions

---

#### TC-DXF-E04: DXF with Special Characters in Text
**Test File:** DXF with TEXT containing Unicode, emojis, or special chars

**Steps:**
1. Import DXF

**Expected Result:**
- Text elements created
- Special characters handled or sanitized
- No rendering errors

**Pass Criteria:** ✅ Special chars handled gracefully

---

## Cross-Feature Integration Tests

### TC-INT-001: Template + Image Trace Workflow
**Steps:**
1. Apply U-Shaped Warehouse template
2. Import background image of actual warehouse
3. Adjust element positions to match photo
4. Remove background image
5. Export as PNG

**Expected Result:**
- Template provides quick base layout
- Background image allows fine-tuning
- Combined workflow speeds up deployment

**Pass Criteria:** ✅ Features work together seamlessly

---

### TC-INT-002: DXF Import + Drag-Drop Enhancement
**Steps:**
1. Import DXF warehouse layout (50 elements)
2. Use drag-drop to add missing elements (e.g., cart parking markers)
3. Save and verify

**Expected Result:**
- DXF provides bulk import
- Drag-drop allows quick additions
- Combined approach efficient

**Pass Criteria:** ✅ DXF + manual enhancements work well

---

### TC-INT-003: Template + DXF + Manual Edits
**Steps:**
1. Apply Flow Rack Zone template (20 flow racks)
2. Import DXF with pallet racks (30 pallets)
3. Drag-drop 5 cart parking markers
4. Import background image to verify alignment

**Expected Result:**
- All sources contribute elements
- No conflicts or overwrites
- Total: 55 elements
- All features coexist

**Pass Criteria:** ✅ Multiple sources additive

---

## Performance Testing

### TC-PERF-001: Template Load Time
**Steps:**
1. Measure time from clicking "Use Template" to canvas fully rendered
2. Test with largest template (U-Shaped, 48 elements)

**Expected Result:**
- Load time < 2 seconds on standard hardware
- No UI freeze

**Pass Criteria:** ✅ Load time acceptable

---

### TC-PERF-002: DXF Processing Time
**Steps:**
1. Import DXF with 100 entities
2. Measure time from file selection to preview display

**Expected Result:**
- Processing time < 3 seconds
- Progress indicator visible

**Pass Criteria:** ✅ Processing time reasonable

---

### TC-PERF-003: Image Load Time (5MB)
**Steps:**
1. Import 5MB warehouse image
2. Measure time to display

**Expected Result:**
- Load time < 2 seconds
- Image quality good

**Pass Criteria:** ✅ Load time acceptable

---

### TC-PERF-004: Canvas Responsiveness with Background Image
**Steps:**
1. Load background image
2. Drag 20 elements around canvas rapidly
3. Zoom in/out repeatedly

**Expected Result:**
- Drag operations smooth (>30fps)
- No lag when zooming
- Background doesn't slow down interactions

**Pass Criteria:** ✅ Canvas remains responsive

---

## Accessibility Testing

### TC-A11Y-001: Keyboard Navigation - Template Library
**Steps:**
1. Click Templates button
2. Use Tab to navigate between template cards
3. Use Enter to select a template

**Expected Result:**
- Modal focusable
- Templates keyboard-navigable
- Can select with Enter key

**Pass Criteria:** ✅ Keyboard accessible

---

### TC-A11Y-002: Screen Reader - DXF Import
**Steps:**
1. Use screen reader to navigate DXF Import modal
2. Listen to announcements

**Expected Result:**
- Modal title announced
- Upload zone describable
- Stats readable
- Error messages announced

**Pass Criteria:** ✅ Screen reader friendly

---

### TC-A11Y-003: Focus Management - Modals
**Steps:**
1. Open any modal (Templates, DXF Import)
2. Press Escape key

**Expected Result:**
- Modal closes
- Focus returns to trigger button

**Pass Criteria:** ✅ Proper focus management

---

## Browser Compatibility

### TC-BROWSER-001: Chrome/Edge Testing
**Steps:**
1. Test all features in latest Chrome and Edge
2. Verify drag-drop, file upload, image rendering

**Expected Result:**
- All features work identically
- No browser-specific issues

**Pass Criteria:** ✅ Full compatibility

---

### TC-BROWSER-002: Firefox Testing
**Steps:**
1. Test in latest Firefox
2. Focus on drag-drop (different API implementation)

**Expected Result:**
- Drag-drop works smoothly
- File pickers functional

**Pass Criteria:** ✅ Firefox compatible

---

### TC-BROWSER-003: Safari Testing
**Steps:**
1. Test in Safari (macOS/iOS)
2. Verify file uploads and image rendering

**Expected Result:**
- All features work
- No Safari-specific bugs

**Pass Criteria:** ✅ Safari compatible

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **Background Images:**
   - Not persisted to database (session-only)
   - Lost when switching layouts or refreshing page
   - Future: Add option to save background with layout

2. **DXF Import:**
   - Only supports LINE, LWPOLYLINE, POLYLINE, TEXT, MTEXT
   - CIRCLE, ARC, INSERT, DIMENSION entities skipped
   - Original DXF labels not preserved (auto-numbered)
   - Block references (INSERTs) not expanded
   - Future: Support more entity types, layer-based categorization

3. **Templates:**
   - Fixed 5 templates (not user-customizable)
   - No category filtering
   - Future: User-created templates, template marketplace

4. **Element Limits:**
   - Free: 50, Pro: 500, Enterprise: Unlimited
   - DXF imports may be truncated if limit exceeded
   - Future: Smart preview of what will fit

### Suggested User Feedback Questions

After testing, ask users:

1. **Template Library:**
   - Which templates did you use most?
   - What additional templates would be useful?
   - Should templates be editable before applying?

2. **Drag-Drop:**
   - Did drag-drop feel more intuitive than click-to-place?
   - Any missing drag feedback (cursor, preview)?
   - Would you like multi-element drag?

3. **Image Import:**
   - Did you use photo tracing?
   - Should background images be saved with layouts?
   - Any issues with image quality/scaling?

4. **DXF Import:**
   - Did DXF files convert accurately?
   - What entity types were missing?
   - Would you import from other CAD formats (DWG, SVG)?

5. **Overall:**
   - How much faster was layout creation with these features?
   - Which feature provided the most value?
   - Any workflow gaps remaining?

---

## Test Execution Tracking

Use this table to track testing progress:

| Test ID | Feature | Status | Tester | Date | Notes |
|---------|---------|--------|--------|------|-------|
| TC-TL-001 | Template Library | ⬜ Not Started | | | |
| TC-TL-002 | Template Library | ⬜ Not Started | | | |
| TC-DD-001 | Drag-Drop | ⬜ Not Started | | | |
| TC-IMG-001 | Image Import | ⬜ Not Started | | | |
| TC-DXF-001 | DXF Import | ⬜ Not Started | | | |
| ... | ... | ... | ... | ... | ... |

**Status Legend:**
- ⬜ Not Started
- 🔄 In Progress
- ✅ Pass
- ❌ Fail
- ⚠️ Blocked

---

## Bug Reporting Template

When reporting bugs, include:

```markdown
**Test Case ID:** TC-XXX-XXX
**Feature:** [Template Library / Drag-Drop / Image Import / DXF Import]
**Severity:** [Critical / High / Medium / Low]
**Browser:** [Chrome 120 / Firefox 121 / Safari 17]
**User Tier:** [Free / Pro / Enterprise]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Video:**
[Attach if possible]

**Console Errors:**
[Copy any browser console errors]

**Additional Context:**
[Any other relevant information]
```

---

## Conclusion

This testing guide covers comprehensive scenarios for all 4 new features. The features are designed to work independently and together, reducing warehouse layout creation time from **hours to minutes**.

**Target Metrics:**
- Template use reduces setup by 80% (from 60 min to 12 min)
- Image trace reduces alignment time by 70%
- DXF import handles bulk layouts in <5 minutes
- Drag-drop reduces element placement time by 50%

**Combined Impact:** Users can create production-ready layouts 5-10× faster than with the blank canvas alone.

For questions or additional test scenarios, contact the development team.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-25
**Maintained By:** Development Team
