# Designer Page UI/UX Overhaul

Modernize the Designer page to match Enterprise SaaS standards (Figma, Miro, Lucidchart). The core changes involve unifying toolbars, cleaning up visual hierarchy, and establishing consistent CSS styling.

---

## User Review Required

> [!IMPORTANT]
> - The bottom `ElementToolbar` will be **removed**; its functionality moves to the Sidebar and PropertiesPanel.
> - The Menu Bar will be simplified, consolidating quick-action buttons into menus.

---

## Proposed Changes

### Component: Layout Structure

#### [MODIFY] [page.tsx](file:///c:/xampp/htdocs/heatmapslotting/frontend/app/designer/page.tsx)
- Remove `ElementToolbar` import and usage.
- Refactor main grid to a clean **Left Sidebar → Canvas → Right Panel** structure.
- Ensure the canvas occupies maximum central space.

---

### Component: Left Sidebar (Tools)

#### [MODIFY] [Sidebar.tsx](file:///c:/xampp/htdocs/heatmapslotting/frontend/components/designer/Sidebar.tsx)
- Consolidate all creation tools (Bay, Rack, Pallet, Text, Line, Arrow, Route Markers).
- Group tools logically with visual dividers:
  - **Warehouse Elements**: Bay, Flow Rack, Pallet
  - **Annotations**: Text, Line, Arrow
  - **Route Markers**: Start, Stop, Cart
- Active state: blue highlight or inset effect.
- Slim, icon-only buttons with hover tooltips.

---

### Component: Right Properties Panel

#### [MODIFY] [PropertiesPanel.tsx](file:///c:/xampp/htdocs/heatmapslotting/frontend/components/designer/PropertiesPanel.tsx)
- **No Selection State**:
  - Show **Canvas Summary** (element counts by type).
  - Show **Label Display Mode** selector (moved from bottom toolbar).
  - Show helpful keyboard shortcuts.
- **Single Selection**: Show properties (already works well).
- **Multi-Selection**:
  - Add alignment tools (Align Left, Center, Right, Top, Middle, Bottom).
  - Add "Bulk Actions" section (Delete, Duplicate).

---

### Component: Menu Bar

#### [MODIFY] [MenuBar.tsx](file:///c:/xampp/htdocs/heatmapslotting/frontend/components/designer/MenuBar.tsx)
- Keep traditional menus: `File | Edit | View | Help`.
- Move `Templates` and `Import DXF` into `File > ...` submenu.
- Move `Show Distances` toggle into `View` menu.
- Remove cluttered quick-action buttons from the top bar.

---

### Component: Status Bar

#### [MODIFY] [StatusBar.tsx](file:///c:/xampp/htdocs/heatmapslotting/frontend/components/designer/StatusBar.tsx)
- Switch from bright blue to dark slate theme (matches sidebar).
- Slim down height (from `h-8` to `h-7`).
- Add "Fit All" button next to zoom controls.
- Add "Snap" toggle indicator.

---

### Component: Floating Canvas Controls

- Remove the floating "Snap On" and "Fit All" buttons from the canvas.
- Integrate "Fit All" into `StatusBar`.
- Integrate "Snap On/Off" into `StatusBar` or `View` menu.

---

### Component: Global Styling

#### [MODIFY] [globals.css](file:///c:/xampp/htdocs/heatmapslotting/frontend/app/globals.css)
Add CSS custom properties for consistency:
```css
:root {
  --panel-bg: #0f172a;
  --panel-border: #1e293b;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
  --accent-red: #ef4444;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
}
```

---

### Deletions

#### [DELETE] [ElementToolbar.tsx](file:///c:/xampp/htdocs/heatmapslotting/frontend/components/ElementToolbar.tsx)
This component is replaced by the enhanced Sidebar and PropertiesPanel.

---

## Verification Plan

### Manual Verification
1. **Layout**: Confirm the bottom toolbar is gone; left sidebar has all tools.
2. **Tool Flow**: Select a tool → Place on canvas → Select element → Edit via right panel.
3. **No Selection**: Verify right panel shows canvas summary and label display options.
4. **Menu Bar**: Confirm Templates/Import DXF are in File menu; Show Distances in View menu.
5. **Status Bar**: Confirm dark theme, zoom controls, Snap toggle, Fit button.
6. **Responsiveness**: Resize window; ensure panels don't break.
