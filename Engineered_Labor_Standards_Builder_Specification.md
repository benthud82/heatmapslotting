# Engineered Labor Standards Builder
## Product Specification Document for SlotWise

**Version:** 1.0  
**Date:** January 2026  
**Author:** SlotWise Product Team

---

## Executive Summary

The Engineered Labor Standards Builder democratizes industrial engineering for warehouses that can't afford $50K-$150K consulting engagements. Using an intuitive drag-and-drop "playlist" interface, operations managers can build accurate time standards for picking processes without IE expertise. The system integrates with SlotWise's existing walk burden calculations to automatically compute travel times based on actual warehouse layouts.

**Core Value Proposition:** "Build professional-grade labor standards in minutes, not months."

---

## Feature Overview

### Three Connected Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENGINEERED LABOR STANDARDS                        │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│   ELEMENT LIBRARY   │  PROCESS DESIGNER   │   BATCH ESTIMATOR       │
│                     │                     │                         │
│  Drag-and-drop      │  Build pick         │  Upload pick data       │
│  time elements      │  process timelines  │  (CSV/WMS export)       │
│                     │                     │                         │
│  • Body motions     │  • Save as          │  • Apply process        │
│  • Pick actions     │    templates        │    templates            │
│  • Equipment        │  • Running totals   │  • Estimate batch       │
│  • Confirmation     │  • Integrate with   │    times                │
│                     │    heatmap distance │  • ROI calculations     │
└─────────────────────┴─────────────────────┴─────────────────────────┘
```

---

## Part 1: Element Library

### 1.1 Element Categories

The element library is organized into **6 main categories** with expandable subcategories:

#### TRAVEL
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| Walk (per foot) | TRV-WALK-FT | 0.035 | Distance (ft) | Auto-calculated from heatmap |
| Walk (per step) | TRV-WALK-STEP | 0.55 | Steps | Manual entry |
| Turn 90° | TRV-TURN-90 | 0.4 | — | |
| Turn 180° | TRV-TURN-180 | 0.7 | — | |
| Change direction | TRV-DIR | 0.3 | — | Slight course correction |
| Pass through door | TRV-DOOR | 3.5 | Door type | Push/Pull/Automatic |
| Enter/exit aisle | TRV-AISLE | 0.8 | — | |

#### BODY MOTION
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| Reach (short <12") | BDY-REACH-S | 0.35 | — | Arm extension |
| Reach (medium 12-24") | BDY-REACH-M | 0.55 | — | |
| Reach (long >24") | BDY-REACH-L | 0.75 | — | Full extension |
| Bend at waist | BDY-BEND | 1.1 | — | Floor level pick |
| Arise from bend | BDY-ARISE-BEND | 1.1 | — | |
| Stoop (deep bend) | BDY-STOOP | 1.5 | — | Very low pick |
| Arise from stoop | BDY-ARISE-STOOP | 1.5 | — | |
| Kneel (one knee) | BDY-KNEEL-1 | 1.0 | — | |
| Kneel (both knees) | BDY-KNEEL-2 | 1.8 | — | |
| Arise from kneel | BDY-ARISE-KNEEL | 1.2 | — | |
| Side step | BDY-SIDESTEP | 0.4 | — | Lateral movement |
| Look/search visually | BDY-LOOK | 0.8 | — | Eye travel/search |

#### PICKING - EACH (Piece Pick)
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| Identify slot location | PCK-E-LOCATE | 0.6 | — | Visual confirm |
| Grasp small item (<1 lb) | PCK-E-GRASP-S | 0.5 | — | One hand, easy |
| Grasp medium item (1-5 lb) | PCK-E-GRASP-M | 0.8 | — | One hand |
| Grasp awkward item | PCK-E-GRASP-AWK | 1.2 | — | Odd shape |
| Grasp fragile item | PCK-E-GRASP-FRAG | 1.5 | — | Careful handling |
| Release to tote | PCK-E-REL-TOTE | 0.4 | — | Simple release |
| Place in tote (careful) | PCK-E-PLACE-CARE | 0.9 | — | Fragile/organized |
| Place in tote (stacking) | PCK-E-PLACE-STACK | 1.1 | — | Building layers |
| Count quantity | PCK-E-COUNT | 0.4/unit | Qty | Per unit counted |
| Verify item (visual) | PCK-E-VERIFY | 0.5 | — | Check label/description |

#### PICKING - CASE
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| Identify case location | PCK-C-LOCATE | 0.6 | — | Visual confirm |
| Grasp case - Light (<15 lb) | PCK-C-GRASP-L | 1.5 | — | One person |
| Grasp case - Medium (15-35 lb) | PCK-C-GRASP-M | 2.2 | — | One person |
| Grasp case - Heavy (35-50 lb) | PCK-C-GRASP-H | 3.2 | — | One person, strain |
| Grasp case - Team lift (>50 lb) | PCK-C-GRASP-TEAM | 8.0 | — | Requires 2nd person |
| Place on pallet - Floor tier | PCK-C-PLACE-T1 | 2.0 | — | Ground level |
| Place on pallet - Middle tier | PCK-C-PLACE-T2 | 2.5 | — | Waist height |
| Place on pallet - Top tier | PCK-C-PLACE-T3 | 3.2 | — | Shoulder height |
| Place on pallet - Overhead | PCK-C-PLACE-T4 | 4.0 | — | Above shoulder |
| Slide case on shelf | PCK-C-SLIDE | 1.8 | — | Push into place |
| Rotate/orient case | PCK-C-ROTATE | 0.8 | — | Label facing out |

#### CONFIRMATION / TECHNOLOGY
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| RF scan - Handheld (retrieve) | CNF-RF-GET | 1.5 | — | Unholster device |
| RF scan - Handheld (scan) | CNF-RF-SCAN | 2.5 | — | Aim and scan |
| RF scan - Handheld (return) | CNF-RF-RET | 1.0 | — | Reholster |
| RF scan - Wearable (scan) | CNF-WEAR-SCAN | 1.2 | — | Ring/wrist scanner |
| RF scan - Read screen | CNF-RF-READ | 1.0 | — | View next task |
| RF scan - Key entry | CNF-RF-KEY | 0.4/digit | Digits | Manual quantity |
| Voice pick - Listen | CNF-VOICE-LISTEN | 1.5 | — | Hear instruction |
| Voice pick - Confirm | CNF-VOICE-CONF | 1.8 | — | Speak check digits |
| Pick-to-light - Confirm | CNF-PTL-CONF | 0.6 | — | Press button |
| Paper - Read line | CNF-PAPER-READ | 2.0 | — | Find next line |
| Paper - Checkoff | CNF-PAPER-CHECK | 1.5 | — | Mark complete |
| Paper - Write quantity | CNF-PAPER-WRITE | 3.0 | — | Record on sheet |

#### ACCESS EQUIPMENT
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| Step stool - Get | EQP-STOOL-GET | 3.0 | — | Retrieve nearby |
| Step stool - Position | EQP-STOOL-POS | 2.0 | — | Place at slot |
| Step stool - Mount | EQP-STOOL-UP | 1.0 | — | Step up |
| Step stool - Dismount | EQP-STOOL-DOWN | 0.8 | — | Step down |
| Step stool - Return | EQP-STOOL-RET | 2.5 | — | Put back |
| Rolling ladder - Get | EQP-LADR-GET | 5.0 | — | Retrieve |
| Rolling ladder - Position | EQP-LADR-POS | 4.0 | — | Roll to location |
| Rolling ladder - Lock | EQP-LADR-LOCK | 1.5 | — | Set brakes |
| Rolling ladder - Climb (per rung) | EQP-LADR-UP | 1.1 | Rungs | Going up |
| Rolling ladder - Descend (per rung) | EQP-LADR-DOWN | 0.9 | Rungs | Going down |
| Rolling ladder - Unlock | EQP-LADR-UNLOCK | 1.0 | — | Release brakes |
| Rolling ladder - Return | EQP-LADR-RET | 6.0 | — | Return to storage |
| Order picker lift - Mount | EQP-OP-MOUNT | 4.5 | — | Get on platform |
| Order picker lift - Dismount | EQP-OP-DISMOUNT | 3.5 | — | Get off platform |
| Order picker lift - Raise (per foot) | EQP-OP-RAISE | 0.8 | Feet | Elevate |
| Order picker lift - Lower (per foot) | EQP-OP-LOWER | 0.6 | Feet | Descend |

#### TRANSPORT EQUIPMENT
| Element | Code | Base Time (sec) | Variables | Notes |
|---------|------|-----------------|-----------|-------|
| Cart - Get | TRN-CART-GET | 5.0 | — | Retrieve empty |
| Cart - Position at slot | TRN-CART-POS | 1.5 | — | Align for picking |
| Cart - Push (per foot) | TRN-CART-PUSH | 0.045 | Distance | Moving with cart |
| Cart - Return | TRN-CART-RET | 4.0 | — | Return to staging |
| Manual pallet jack - Get | TRN-MPJ-GET | 8.0 | — | Retrieve with pallet |
| Manual pallet jack - Insert forks | TRN-MPJ-INSERT | 3.0 | — | Under pallet |
| Manual pallet jack - Pump up | TRN-MPJ-PUMP | 2.5 | — | Raise pallet |
| Manual pallet jack - Pull (per foot) | TRN-MPJ-PULL | 0.06 | Distance | Moving loaded |
| Manual pallet jack - Lower | TRN-MPJ-LOWER | 1.5 | — | Set down |
| Manual pallet jack - Remove forks | TRN-MPJ-REMOVE | 2.0 | — | Extract forks |
| Electric pallet jack - Mount | TRN-EPJ-MOUNT | 2.5 | — | Step on platform |
| Electric pallet jack - Dismount | TRN-EPJ-DISMOUNT | 2.0 | — | Step off |
| Electric pallet jack - Drive (per foot) | TRN-EPJ-DRIVE | 0.025 | Distance | Powered travel |
| Forklift - Mount | TRN-FORK-MOUNT | 5.0 | — | Get in seat |
| Forklift - Dismount | TRN-FORK-DISMOUNT | 4.0 | — | Get out |
| Forklift - Drive (per foot) | TRN-FORK-DRIVE | 0.02 | Distance | Powered travel |
| Forklift - Raise forks | TRN-FORK-RAISE | 3.0 | — | Per tier |
| Forklift - Lower forks | TRN-FORK-LOWER | 2.5 | — | Per tier |

### 1.2 Element Library UI Design

**Aesthetic Direction:** Industrial/Utilitarian meets Modern Dashboard
- Clean, functional interface with a "control panel" feel
- Color-coded categories for quick identification
- Monospace or technical fonts for time values
- High contrast for readability in warehouse office lighting

```
┌─────────────────────────────────────────────────────────────────┐
│  ELEMENT LIBRARY                              🔍 Search...      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▼ TRAVEL                                            ⚙️ 7 items │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ ═══ Walk (per foot)              0.035s    📏 Distance      │
│  │ ═══ Walk (per step)              0.55s     🔢 Steps         │
│  │ ↻   Turn 90°                     0.4s                       │
│  │ ↺   Turn 180°                    0.7s                       │
│  │ ◇   Change direction             0.3s                       │
│  │ 🚪  Pass through door            3.5s      📋 Type          │
│  │ ▸   Enter/exit aisle             0.8s                       │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ▶ BODY MOTION                                      ⚙️ 12 items │
│  ▶ PICKING - EACH                                   ⚙️ 10 items │
│  ▶ PICKING - CASE                                   ⚙️ 11 items │
│  ▶ CONFIRMATION                                     ⚙️ 12 items │
│  ▶ ACCESS EQUIPMENT                                 ⚙️ 16 items │
│  ▶ TRANSPORT                                        ⚙️ 17 items │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  MY CUSTOM ELEMENTS                          [+ Create New]     │
│  └ (empty - create your first custom element)                   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  HIDDEN ELEMENTS                              [Manage Hidden]   │
│  └ 3 elements hidden from view                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Element Interactions

**On Hover:**
- Show tooltip with full description and usage notes
- Highlight with subtle glow effect

**On Drag:**
- Element becomes semi-transparent "ghost"
- Shows drop zone indicators in Process Designer
- Cursor changes to "grabbing"

**On Right-Click:**
- Context menu: Hide from library | Edit (if custom) | Duplicate to custom | View details

**Search Functionality:**
- Real-time filter as user types
- Searches element names, codes, and descriptions
- Highlights matching text

---

## Part 2: Process Designer

### 2.1 Overview

The Process Designer is where users build picking process templates by dragging elements into a vertical timeline. Each template represents a **single pick cycle** — from approaching a slot to completing the pick and moving to the next.

### 2.2 Process Designer UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PROCESS DESIGNER                                                        │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                         │
│  Template: [Standard Each Pick - RF Scan - Ground to Waist Level  ▼]   │
│                                                        [Save] [Save As] │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ PICK CYCLE TIMELINE                                              │   │
│  │                                                          🗑️ Clear │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  ● START                                                  0.0s   │   │
│  │  │                                                               │   │
│  │  ├─ 1. ═══ Walk to slot location            ▸ FROM HEATMAP      │   │
│  │  │       └ Distance calculated from warehouse layout             │   │
│  │  │                                                               │   │
│  │  ├─ 2. 👁️ Identify slot location                        0.6s    │   │
│  │  │                                                               │   │
│  │  ├─ 3. 📱 RF scan - Read screen                         1.0s    │   │
│  │  │                                                               │   │
│  │  ├─ 4. ↓ Bend at waist (if floor pick)          [CONDITIONAL]   │   │
│  │  │       └ Apply when: Slot level = Floor                1.1s    │   │
│  │  │                                                               │   │
│  │  ├─ 5. ✋ Reach medium                                   0.55s   │   │
│  │  │                                                               │   │
│  │  ├─ 6. 🫳 Grasp medium item                             0.8s    │   │
│  │  │                                                               │   │
│  │  ├─ 7. ↑ Arise from bend (if floor pick)        [CONDITIONAL]   │   │
│  │  │       └ Apply when: Slot level = Floor                1.1s    │   │
│  │  │                                                               │   │
│  │  ├─ 8. 📦 Place in tote                                 0.9s    │   │
│  │  │                                                               │   │
│  │  ├─ 9. 📱 RF scan - Wearable scan                       1.2s    │   │
│  │  │                                                               │   │
│  │  ● END                                                           │   │
│  │                                                                  │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  ⬇️  DROP ELEMENTS HERE  ⬇️                                │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  RUNNING TOTALS                                                  │   │
│  │  ═══════════════════════════════════════════════════════════════│   │
│  │                                                                  │   │
│  │  Fixed Elements (always apply):                          5.05s   │   │
│  │  Conditional Elements (when applicable):                +2.20s   │   │
│  │  Travel Time:                              ▸ FROM HEATMAP DATA   │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  BASE PICK TIME (excluding travel):                     5.05s   │   │
│  │  WITH FLOOR PICK CONDITIONALS:                          7.25s   │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  📊 ESTIMATED PICKS PER HOUR (excluding travel)         │    │   │
│  │  │                                                         │    │   │
│  │  │  Waist-level picks:    ████████████████████  ~497/hr   │    │   │
│  │  │  Floor-level picks:    █████████████████     ~372/hr   │    │   │
│  │  │                                                         │    │   │
│  │  │  * Add 10-15% PF&D allowance for realistic targets     │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Element Configuration Panel

When an element in the timeline is clicked, a configuration panel appears:

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURE ELEMENT                                    [×]   │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Element: Bend at waist                                     │
│  Code: BDY-BEND                                             │
│  Base Time: 1.1 seconds                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ☑️  Make this element CONDITIONAL                          │
│                                                             │
│  Apply this element when:                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Slot Level ▼]  [equals ▼]  [Floor ▼]              │   │
│  │                                          [+ Add AND] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Available condition fields:                                │
│  • Slot Level: Floor, Knee, Waist, Shoulder, Overhead      │
│  • Item Weight: Light, Medium, Heavy, Team Lift            │
│  • Item Type: Each, Case                                   │
│  • Equipment: None, Step Stool, Ladder, Order Picker       │
│  • Pick Qty: Single, Multiple (count-based)                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Delete Element]        [Cancel]        [Save Changes]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Heatmap Integration

**Key Integration Point:** Travel time should automatically pull from the existing walk burden calculations.

When user selects "Walk to slot location" element:

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURE: Walk to slot location                     [×]   │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Travel Calculation Method:                                 │
│                                                             │
│  ◉ AUTO: Use Heatmap Distance Data                         │
│     └ Travel time will be calculated per-pick based        │
│       on actual slot locations in your warehouse layout    │
│                                                             │
│  ○ MANUAL: Fixed Distance                                  │
│     └ Enter average travel distance: [____] feet           │
│                                                             │
│  ○ MANUAL: Fixed Time                                      │
│     └ Enter average travel time: [____] seconds            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  When AUTO is selected:                                     │
│  • System uses your warehouse layout dimensions            │
│  • Calculates distance from previous pick to current       │
│  • Applies walk speed: 0.035 sec/foot (adjustable)         │
│  • Accounts for aisle routing (no through-rack travel)     │
│                                                             │
│  Your current warehouse walk speed setting: 0.035 sec/ft   │
│  [Adjust Walk Speed Settings]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Template Management

**Saving Templates:**
```
┌─────────────────────────────────────────────────────────────┐
│  SAVE PROCESS TEMPLATE                                [×]   │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Template Name:                                             │
│  [Standard Each Pick - RF Wearable - Ground to Waist     ] │
│                                                             │
│  Category: [Piece Picking ▼]                               │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Standard process for picking individual items from   │   │
│  │ floor to waist-level shelving using wearable RF     │   │
│  │ scanner. Includes conditional bend for floor picks. │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Apply to slot levels:                                      │
│  ☑️ Floor   ☑️ Knee   ☑️ Waist   ☐ Shoulder   ☐ Overhead   │
│                                                             │
│  ☐ Set as default template for new estimates               │
│                                                             │
│  [Cancel]                                    [Save Template]│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Template Library:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  MY PROCESS TEMPLATES                                   [+ New Template] │
│  ════════════════════════════════════════════════════════════════════   │
│                                                                         │
│  PIECE PICKING (4 templates)                                            │
│  ├─ ★ Standard Each Pick - RF Wearable - Ground to Waist    5.05s base │
│  ├─   Standard Each Pick - RF Handheld                       7.50s base │
│  ├─   Each Pick with Ladder Access                          14.20s base │
│  └─   Fragile Item Pick - Extra Care                         8.30s base │
│                                                                         │
│  CASE PICKING (3 templates)                                             │
│  ├─ ★ Standard Case Pick - RF Scan - Light Cases            6.80s base │
│  ├─   Heavy Case Pick - Two Person                          15.50s base │
│  └─   Case Pick to Pallet Jack                               9.20s base │
│                                                                         │
│  BATCH PICKING (2 templates)                                            │
│  ├─   Multi-item Cart Pick                                   4.20s/item │
│  └─   Cluster Pick - 12 Tote Cart                            3.80s/item │
│                                                                         │
│  ★ = Default template for category                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Batch Estimator

### 3.1 Overview

The Batch Estimator takes **real pick data** (uploaded CSV or from WMS) and applies process templates to calculate expected completion times for batches, waves, or cart loads.

### 3.2 Data Upload Requirements

**Required Fields:**
| Field | Description | Example |
|-------|-------------|---------|
| `pick_id` | Unique identifier | PKL-20240115-001 |
| `slot_location` | Slot identifier (matches heatmap) | A-01-03-B |
| `sku` | Item SKU | SKU-12345 |
| `quantity` | Qty to pick | 3 |
| `item_type` | Each or Case | Each |

**Optional Fields (enhance accuracy):**
| Field | Description | Example |
|-------|-------------|---------|
| `batch_id` | Group picks into batches | BATCH-001 |
| `wave_id` | Group batches into waves | WAVE-AM-01 |
| `slot_level` | Height tier | Floor, Knee, Waist, Shoulder, Overhead |
| `item_weight` | Weight category | Light, Medium, Heavy |
| `sequence` | Pick order (if pre-sequenced) | 1, 2, 3... |
| `zone` | Warehouse zone | Zone-A |

### 3.3 Batch Estimator UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BATCH ESTIMATOR                                                            │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  STEP 1: Upload Pick Data                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │    ╔═══════════════════════════════════════════════════════════╗   │   │
│  │    ║                                                           ║   │   │
│  │    ║   📄  Drag & Drop CSV file here                          ║   │   │
│  │    ║       or [Browse Files]                                   ║   │   │
│  │    ║                                                           ║   │   │
│  │    ║   Supported: .csv, .xlsx, .xls                           ║   │   │
│  │    ║   [Download Template CSV]                                 ║   │   │
│  │    ║                                                           ║   │   │
│  │    ╚═══════════════════════════════════════════════════════════╝   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  STEP 2: Map Columns                           (after upload)               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Your Column          →    Maps To                     Status       │   │
│  │  ──────────────────────────────────────────────────────────────     │   │
│  │  "Location"           →    [slot_location ▼]           ✅ Matched   │   │
│  │  "SKU_Code"           →    [sku ▼]                     ✅ Matched   │   │
│  │  "Pick_Qty"           →    [quantity ▼]                ✅ Matched   │   │
│  │  "Item_Type"          →    [item_type ▼]               ✅ Matched   │   │
│  │  "Pick_ID"            →    [pick_id ▼]                 ✅ Matched   │   │
│  │  "Batch"              →    [batch_id ▼]                ✅ Matched   │   │
│  │  "Level"              →    [slot_level ▼]              ✅ Matched   │   │
│  │  "Weight_Cat"         →    [item_weight ▼]             ✅ Matched   │   │
│  │                                                                      │   │
│  │  ⚠️  2 columns unmapped (optional): "Notes", "Priority"             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  STEP 3: Select Process Templates                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  For EACH picks, use template:                                      │   │
│  │  [★ Standard Each Pick - RF Wearable - Ground to Waist ▼]          │   │
│  │                                                                      │   │
│  │  For CASE picks, use template:                                      │   │
│  │  [★ Standard Case Pick - RF Scan - Light Cases ▼]                  │   │
│  │                                                                      │   │
│  │  ☑️ Apply conditional elements based on slot_level                  │   │
│  │  ☑️ Apply weight adjustments based on item_weight                   │   │
│  │  ☑️ Calculate travel time from heatmap layout                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│                                              [Cancel]  [▶ Run Estimate]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Results Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ESTIMATION RESULTS                                    [Export PDF] [CSV]   │
│  ════════════════════════════════════════════════════════════════════════   │
│  File: warehouse_picks_20240115.csv | 1,247 picks | 12 batches              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUMMARY                                                                    │
│  ┌──────────────────┬──────────────────┬──────────────────┬────────────┐   │
│  │  TOTAL PICKS     │  TOTAL TIME      │  AVG TIME/PICK   │  PICKS/HR  │   │
│  │      1,247       │    4h 12m 35s    │     12.1 sec     │    ~297    │   │
│  └──────────────────┴──────────────────┴──────────────────┴────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  TIME BREAKDOWN                                                       │  │
│  │  ════════════════════════════════════════════════════════════════    │  │
│  │                                                                       │  │
│  │  Travel Time          ████████████████████████████████  55%  2h 19m  │  │
│  │  Pick Operations      █████████████████                  31%  1h 18m  │  │
│  │  Confirmation (RF)    ████                               8%   20m     │  │
│  │  Body Motions         ███                                6%   15m     │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BY BATCH                                                                   │
│  ┌────────────┬────────┬────────────┬───────────┬───────────┬───────────┐ │
│  │  Batch ID  │ Picks  │ Est. Time  │ Travel %  │ Picks/Hr  │  Status   │ │
│  ├────────────┼────────┼────────────┼───────────┼───────────┼───────────┤ │
│  │  BATCH-001 │   98   │   19m 42s  │   52%     │   298     │ ✅ Normal │ │
│  │  BATCH-002 │  112   │   24m 15s  │   58%     │   277     │ ⚠️ High   │ │
│  │  BATCH-003 │   87   │   16m 33s  │   48%     │   315     │ ✅ Normal │ │
│  │  BATCH-004 │  156   │   38m 12s  │   61%     │   245     │ 🔴 Review │ │
│  │  BATCH-005 │   92   │   18m 05s  │   51%     │   305     │ ✅ Normal │ │
│  │  ...       │   ...  │   ...      │   ...     │   ...     │   ...     │ │
│  └────────────┴────────┴────────────┴───────────┴───────────┴───────────┘ │
│                                                                             │
│  🔴 BATCH-004 flagged: Travel time is 61% (threshold: 55%)                 │
│     → Consider re-slotting high-velocity items in this batch               │
│     → [View in Heatmap] [View Picks] [Slotting Recommendations]            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STAFFING CALCULATOR                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Target completion time: [2 hours      ▼]                            │  │
│  │  PF&D Allowance:        [15% ▼] (Personal, Fatigue, Delay)          │  │
│  │                                                                       │  │
│  │  ════════════════════════════════════════════════════════════════    │  │
│  │                                                                       │  │
│  │  RECOMMENDED PICKERS:          3 people                              │  │
│  │                                                                       │  │
│  │  Expected completion:          1h 52m (with 15% allowance)           │  │
│  │  Utilization per picker:       93%                                   │  │
│  │                                                                       │  │
│  │  ─────────────────────────────────────────────────────────────────   │  │
│  │                                                                       │  │
│  │  Alternative scenarios:                                               │  │
│  │  • 2 pickers → 2h 48m completion (over target)                       │  │
│  │  • 4 pickers → 1h 24m completion (76% utilization)                   │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Heatmap Integration - "What If" Slotting

Connect the Batch Estimator results back to the heatmap for optimization insights:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SLOTTING IMPACT ANALYSIS                                                   │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Based on your pick data, we identified optimization opportunities:         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  🎯 TOP RECOMMENDATION                                               │  │
│  │                                                                       │  │
│  │  Move SKU-12345 from slot C-15-04-A to slot A-03-02-B               │  │
│  │                                                                       │  │
│  │  Current picks: 47 picks across 8 batches                            │  │
│  │  Current avg travel: 142 feet per pick                               │  │
│  │  New avg travel: 38 feet per pick                                    │  │
│  │                                                                       │  │
│  │  ════════════════════════════════════════════════════════════════    │  │
│  │                                                                       │  │
│  │  TIME SAVED:  3.6 seconds/pick × 47 picks = 2m 49s per day          │  │
│  │  ANNUAL IMPACT: ~17 hours saved                                      │  │
│  │  COST SAVINGS: ~$340/year (at $20/hr)                                │  │
│  │                                                                       │  │
│  │  [View on Heatmap]    [Apply Recommendation]    [Dismiss]            │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  3 more recommendations available...                             [View All] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Database Schema

### 4.1 New Tables

```sql
-- Time Elements Library (system + custom)
CREATE TABLE time_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),  -- NULL for system elements
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    base_time_seconds DECIMAL(8,4) NOT NULL,
    time_unit VARCHAR(20) DEFAULT 'fixed',  -- 'fixed', 'per_foot', 'per_unit', 'per_rung'
    description TEXT,
    variables JSONB,  -- {distance: true, qty: true, etc.}
    is_system BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,  -- user-hidden from library
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Process Templates
CREATE TABLE process_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    item_type VARCHAR(20),  -- 'each', 'case', 'both'
    slot_levels VARCHAR(100)[],  -- ['Floor', 'Knee', 'Waist']
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Template Elements (the "playlist")
CREATE TABLE template_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES process_templates(id) ON DELETE CASCADE,
    element_id UUID REFERENCES time_elements(id),
    sequence_order INTEGER NOT NULL,
    is_conditional BOOLEAN DEFAULT false,
    conditions JSONB,  -- {"slot_level": "Floor", "item_weight": "Heavy"}
    variable_values JSONB,  -- {"distance": "auto_heatmap", "rungs": 3}
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Batch Estimates (saved estimation runs)
CREATE TABLE batch_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    name VARCHAR(200),
    source_file_name VARCHAR(255),
    total_picks INTEGER,
    total_time_seconds DECIMAL(12,2),
    avg_time_per_pick DECIMAL(8,4),
    picks_per_hour DECIMAL(8,2),
    time_breakdown JSONB,  -- {"travel": 0.55, "pick": 0.31, "confirm": 0.08, "body": 0.06}
    settings JSONB,  -- templates used, allowances, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Batch Estimate Details (per-pick calculations)
CREATE TABLE batch_estimate_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID REFERENCES batch_estimates(id) ON DELETE CASCADE,
    pick_id VARCHAR(100),
    batch_id VARCHAR(100),
    wave_id VARCHAR(100),
    slot_location VARCHAR(50),
    sku VARCHAR(100),
    quantity INTEGER,
    item_type VARCHAR(20),
    slot_level VARCHAR(30),
    item_weight VARCHAR(30),
    travel_time_seconds DECIMAL(8,4),
    pick_time_seconds DECIMAL(8,4),
    total_time_seconds DECIMAL(8,4),
    template_id UUID REFERENCES process_templates(id),
    calculation_details JSONB  -- breakdown of each element applied
);

-- User Settings for Labor Module
CREATE TABLE labor_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
    walk_speed_sec_per_foot DECIMAL(6,4) DEFAULT 0.035,
    default_pfd_allowance DECIMAL(4,2) DEFAULT 0.15,
    labor_cost_per_hour DECIMAL(8,2) DEFAULT 20.00,
    travel_threshold_warning DECIMAL(4,2) DEFAULT 0.55,  -- warn if travel > 55%
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Seed Data for System Elements

The ~85 elements from Part 1 should be seeded as system elements with `is_system = true` and `user_id = NULL`.

---

## Part 5: API Endpoints

### 5.1 Element Library

```
GET    /api/labor/elements              - List all elements (system + user custom)
POST   /api/labor/elements              - Create custom element
PUT    /api/labor/elements/:id          - Update custom element
DELETE /api/labor/elements/:id          - Delete custom element
PATCH  /api/labor/elements/:id/hide     - Toggle hide from library
```

### 5.2 Process Templates

```
GET    /api/labor/templates             - List user's templates
GET    /api/labor/templates/:id         - Get template with elements
POST   /api/labor/templates             - Create template
PUT    /api/labor/templates/:id         - Update template
DELETE /api/labor/templates/:id         - Delete template
POST   /api/labor/templates/:id/clone   - Clone template
PATCH  /api/labor/templates/:id/default - Set as default for category
```

### 5.3 Batch Estimator

```
POST   /api/labor/estimate              - Run estimation on uploaded data
GET    /api/labor/estimates             - List saved estimates
GET    /api/labor/estimates/:id         - Get estimate details
DELETE /api/labor/estimates/:id         - Delete saved estimate
GET    /api/labor/estimates/:id/export  - Export as PDF/CSV
```

### 5.4 Integration with Heatmap

```
GET    /api/labor/calculate-travel      - Calculate travel time between slots
POST   /api/labor/slotting-impact       - Analyze slotting recommendations based on picks
```

---

## Part 6: UI/UX Design Guidelines

### 6.1 Aesthetic Direction

**Theme:** "Industrial Control Panel" meets "Modern SaaS Dashboard"

**Color Palette:**
```css
:root {
  /* Primary - Industrial Blue */
  --primary-900: #0c1929;
  --primary-800: #162d4a;
  --primary-700: #1e3a5f;
  --primary-600: #2563eb;  /* Accent */
  --primary-500: #3b82f6;
  
  /* Neutrals - Steel Gray */
  --neutral-950: #09090b;
  --neutral-900: #18181b;
  --neutral-800: #27272a;
  --neutral-700: #3f3f46;
  --neutral-600: #52525b;
  --neutral-400: #a1a1aa;
  --neutral-200: #e4e4e7;
  --neutral-50: #fafafa;
  
  /* Status Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #06b6d4;
  
  /* Category Colors */
  --cat-travel: #8b5cf6;      /* Purple */
  --cat-body: #f59e0b;        /* Amber */
  --cat-pick-each: #22c55e;   /* Green */
  --cat-pick-case: #06b6d4;   /* Cyan */
  --cat-confirm: #3b82f6;     /* Blue */
  --cat-equipment: #ec4899;   /* Pink */
  --cat-transport: #f97316;   /* Orange */
}
```

**Typography:**
```css
/* Headers - Technical/Industrial feel */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Body - Clean and readable */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Time Values - Always monospace for alignment */
font-family: 'JetBrains Mono', monospace;
font-variant-numeric: tabular-nums;
```

### 6.2 Component Patterns

**Draggable Element Card:**
```
┌─────────────────────────────────────────────┐
│ ⬡ [Category Color Bar]                      │
├─────────────────────────────────────────────┤
│ ≡  Walk (per foot)                   0.035s │
│    └ Distance-based calculation             │
│                                    📏 vars  │
└─────────────────────────────────────────────┘
```

**Timeline Element (in process designer):**
```
├─ 3. 📱 RF scan - Read screen              1.0s
│      └ Confirm next pick instruction
```

**Running Total Card:**
```
┌────────────────────────────────────┐
│  BASE PICK TIME                    │
│  ══════════════════════════════    │
│                                    │
│     5.05 seconds                   │
│                                    │
│  ≈ 497 picks/hour                  │
│    (before travel & allowances)    │
└────────────────────────────────────┘
```

### 6.3 Interactions & Animations

**Drag & Drop:**
- Elements lift with subtle scale (1.02) and shadow on drag start
- Drop zones highlight with pulsing border
- Successful drop: element slides into place with spring animation
- Invalid drop: element snaps back with shake animation

**Running Total Updates:**
- Number transitions with count-up/down animation
- Flash highlight on change (subtle pulse)

**Category Expansion:**
- Smooth height animation (300ms ease-out)
- Staggered reveal of child elements (50ms delay each)

---

## Part 7: Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema creation and migrations
- [ ] Seed system elements data
- [ ] Basic API endpoints for elements and templates
- [ ] Element Library UI component

### Phase 2: Process Designer (Week 3-4)
- [ ] Drag-and-drop timeline interface
- [ ] Element configuration panel
- [ ] Conditional element logic
- [ ] Running totals calculation
- [ ] Template save/load functionality

### Phase 3: Batch Estimator (Week 5-6)
- [ ] CSV upload and parsing
- [ ] Column mapping interface
- [ ] Estimation calculation engine
- [ ] Results dashboard
- [ ] Staffing calculator

### Phase 4: Heatmap Integration (Week 7-8)
- [ ] Travel time auto-calculation from heatmap distances
- [ ] "What if" slotting impact analysis
- [ ] Recommendations engine connection
- [ ] ROI calculator integration

### Phase 5: Polish & Export (Week 9-10)
- [ ] PDF export for estimates
- [ ] CSV export for batch details
- [ ] UI polish and animations
- [ ] Mobile responsiveness
- [ ] User testing and iteration

---

## Part 8: Success Metrics

### User Engagement
- Templates created per user
- Estimates run per week
- Time spent in Process Designer
- Custom elements created

### Value Delivered
- Estimated hours saved per month (calculated from recommendations)
- Slotting recommendations accepted
- Staffing accuracy (if users report actual vs. estimated)

### Competitive Differentiation
- Feature parity with $50K+ IE consulting
- Time to create first standard (target: <10 minutes)
- Accuracy vs. traditional methods (target: within 10%)

---

## Appendix A: Sample Process Templates

### A.1 Standard Each Pick - RF Wearable

```
1. Walk to slot location              [AUTO - from heatmap]
2. Identify slot location             0.6s
3. RF scan - Read screen              1.0s
4. [IF Floor] Bend at waist           1.1s
5. Reach medium                       0.55s
6. Grasp medium item                  0.8s
7. [IF Floor] Arise from bend         1.1s
8. Place in tote                      0.9s
9. RF scan - Wearable scan            1.2s
────────────────────────────────────────────
BASE TIME (waist level):              5.05s
BASE TIME (floor level):              7.25s
```

### A.2 Case Pick to Pallet - Manual Jack

```
1. Walk to slot location              [AUTO - from heatmap]
2. Identify case location             0.6s
3. RF scan - Read screen              1.0s
4. [IF Heavy] Position for lift       1.5s
5. Grasp case (by weight)             1.5-3.2s
6. Carry to pallet jack               [variable distance]
7. Place on pallet (by tier)          2.0-4.0s
8. RF scan - Wearable scan            1.2s
9. [IF last pick] Lower pallet jack   1.5s
────────────────────────────────────────────
BASE TIME (light, floor tier):        6.8s
BASE TIME (heavy, top tier):          11.4s
```

---

## Appendix B: Allowance Guidelines

### Personal, Fatigue & Delay (PF&D) Allowances

| Condition | Recommended Allowance |
|-----------|----------------------|
| Light work, climate controlled | 10-12% |
| Standard warehouse work | 13-15% |
| Heavy lifting, physical | 15-18% |
| Extreme temperatures | 18-22% |
| High-stress, fast-paced | 15-20% |

### When to Apply

- **Personal:** Restroom, water breaks (~5%)
- **Fatigue:** Physical recovery, varies by intensity (~5-10%)
- **Delay:** Equipment issues, WMS delays, congestion (~3-5%)

Users should configure their facility's standard PF&D in Labor Settings.

---

*End of Specification Document*
