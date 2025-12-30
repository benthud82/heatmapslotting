/**
 * Auto-Align Algorithm for Warehouse Layout
 *
 * Implements Figma-style "Tidy Up" pattern detection and correction.
 * Detects rows/columns of elements and identifies misalignments.
 * Now supports both warehouse elements and cart parking route markers.
 */

import { WarehouseElement, RouteMarker, ROUTE_MARKER_CONFIGS } from './types';

// Configuration constants
export const AUTO_ALIGN_CONFIG = {
  POSITION_TOLERANCE: 10,      // Pixels - misalignment detection threshold
  CLUSTER_TOLERANCE: 40,       // Pixels - larger tolerance for initial clustering (catches outliers)
  MISALIGNMENT_THRESHOLD: 5,   // Pixels - elements off by more than this are misaligned
  SPACING_BUCKET_SIZE: 3,      // Pixels - spacing values within this range are grouped for MODE
  MIN_CLUSTER_SIZE: 2,         // Minimum elements to form a valid cluster
};

// Unified alignable item (can be element or marker)
export interface AlignableItem {
  id: string;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  itemType: 'element' | 'marker';
  originalElement?: WarehouseElement;
  originalMarker?: RouteMarker;
}

// Item with calculated center
interface ItemWithCenter {
  item: AlignableItem;
  centerX: number;
  centerY: number;
}

// Represents an item within a cluster
export interface ClusteredItem {
  item: AlignableItem;
  centerX: number;
  centerY: number;
  currentPosition: number;     // X for columns, Y for rows (the varying axis)
  anchorPosition: number;      // Y for rows, X for columns (the constant axis)
  expectedPosition: number;    // Where item should be after correction
  deviation: number;           // Distance from expected position
  isMisaligned: boolean;       // True if deviation > threshold
}

// Represents a detected row or column of items
export interface AlignmentCluster {
  id: string;
  type: 'row' | 'column';
  anchorPosition: number;      // The Y (for rows) or X (for columns) position bucket
  modePosition: number;        // Statistical mode of anchor axis positions
  modeSpacing: number;         // Statistical mode of spacing between items
  items: ClusteredItem[];
  // Legacy alias for backward compatibility
  elements: ClusteredElement[];
}

// Legacy type for backward compatibility
export interface ClusteredElement {
  element: WarehouseElement;
  centerX: number;
  centerY: number;
  currentPosition: number;
  anchorPosition: number;
  expectedPosition: number;
  deviation: number;
  isMisaligned: boolean;
}

// Item correction details
export interface MisalignedItem {
  item: AlignableItem;
  cluster: AlignmentCluster;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  deviationX: number;
  deviationY: number;
}

// Legacy type alias
export interface MisalignedElement {
  element: WarehouseElement;
  cluster: AlignmentCluster;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  deviationX: number;
  deviationY: number;
}

// Result of pattern detection
export interface PatternDetectionResult {
  rows: AlignmentCluster[];
  columns: AlignmentCluster[];
  totalMisaligned: number;
  misalignedItems: MisalignedItem[];
  misalignedElements: MisalignedElement[]; // Legacy alias for backward compat
  orphans: AlignableItem[];
  orphanElements: WarehouseElement[]; // Legacy alias
}

// Single item correction
export interface ItemCorrection {
  itemId: string;
  itemLabel: string;
  itemType: 'element' | 'marker';
  originalX: number;
  originalY: number;
  targetX: number;
  targetY: number;
  deltaX: number;
  deltaY: number;
}

// Legacy type alias
export interface ElementCorrection {
  elementId: string;
  elementLabel: string;
  itemType?: 'element' | 'marker';
  originalX: number;
  originalY: number;
  targetX: number;
  targetY: number;
  deltaX: number;
  deltaY: number;
}

// Correction plan to be applied
export interface CorrectionPlan {
  corrections: ElementCorrection[];
  totalElements: number;
  totalMisaligned: number;
  estimatedMaxDeviation: number;
  rowCount: number;
  columnCount: number;
}

/**
 * Get the center point of an alignable item
 */
function getItemCenter(item: AlignableItem): { centerX: number; centerY: number } {
  return {
    centerX: Number(item.x_coordinate) + Number(item.width) / 2,
    centerY: Number(item.y_coordinate) + Number(item.height) / 2,
  };
}

/**
 * Convert warehouse element to alignable item
 */
function elementToAlignableItem(element: WarehouseElement): AlignableItem {
  return {
    id: element.id,
    label: element.label,
    x_coordinate: Number(element.x_coordinate),
    y_coordinate: Number(element.y_coordinate),
    width: Number(element.width),
    height: Number(element.height),
    itemType: 'element',
    originalElement: element,
  };
}

/**
 * Convert cart parking marker to alignable item
 */
function markerToAlignableItem(marker: RouteMarker): AlignableItem {
  const config = ROUTE_MARKER_CONFIGS.cart_parking;
  return {
    id: marker.id,
    label: marker.label,
    x_coordinate: Number(marker.x_coordinate),
    y_coordinate: Number(marker.y_coordinate),
    width: config.width,
    height: config.height,
    itemType: 'marker',
    originalMarker: marker,
  };
}

/**
 * Calculate statistical mode (most common value) with bucketing
 */
function calculateMode(values: number[], bucketSize: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const buckets = new Map<number, number[]>();

  values.forEach(v => {
    const bucket = Math.round(v / bucketSize) * bucketSize;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, []);
    }
    buckets.get(bucket)!.push(v);
  });

  let maxCount = 0;
  let modeValues: number[] = [];

  buckets.forEach((vals) => {
    if (vals.length > maxCount) {
      maxCount = vals.length;
      modeValues = vals;
    }
  });

  // Return average of values in mode bucket for precision
  return modeValues.reduce((a, b) => a + b, 0) / modeValues.length;
}

/**
 * Cluster items by their position on a given axis
 * Uses larger CLUSTER_TOLERANCE for initial grouping to catch outliers
 */
function clusterByAxis(
  items: ItemWithCenter[],
  axis: 'x' | 'y',
  config: typeof AUTO_ALIGN_CONFIG
): AlignmentCluster[] {
  const anchorKey = axis; // The axis we're clustering by (constant within cluster)
  const varyingKey = axis === 'y' ? 'x' : 'y'; // The axis that varies within the cluster

  // Phase 1: Group items using larger CLUSTER_TOLERANCE to catch outliers
  const groups = new Map<number, ItemWithCenter[]>();

  items.forEach(item => {
    const anchorValue = axis === 'y' ? item.centerY : item.centerX;
    const bucket = Math.round(anchorValue / config.CLUSTER_TOLERANCE) * config.CLUSTER_TOLERANCE;

    if (!groups.has(bucket)) {
      groups.set(bucket, []);
    }
    groups.get(bucket)!.push(item);
  });

  // Phase 2: For items not yet in a cluster, try to assign them to nearest cluster
  const orphanedItems: ItemWithCenter[] = [];
  const clusteredGroups = new Map<number, ItemWithCenter[]>();

  groups.forEach((groupItems, bucket) => {
    if (groupItems.length >= config.MIN_CLUSTER_SIZE) {
      clusteredGroups.set(bucket, groupItems);
    } else {
      orphanedItems.push(...groupItems);
    }
  });

  // Try to assign orphans to their nearest cluster
  orphanedItems.forEach(orphan => {
    const orphanAnchor = axis === 'y' ? orphan.centerY : orphan.centerX;
    let nearestBucket: number | null = null;
    let minDistance = Infinity;

    clusteredGroups.forEach((_, bucket) => {
      const distance = Math.abs(orphanAnchor - bucket);
      if (distance < minDistance && distance <= config.CLUSTER_TOLERANCE * 1.5) {
        minDistance = distance;
        nearestBucket = bucket;
      }
    });

    if (nearestBucket !== null) {
      clusteredGroups.get(nearestBucket)!.push(orphan);
    }
  });

  // Convert groups to clusters
  const clusters: AlignmentCluster[] = [];

  clusteredGroups.forEach((groupItems, anchorBucket) => {
    if (groupItems.length < config.MIN_CLUSTER_SIZE) return;

    // Sort by the varying axis
    const sorted = [...groupItems].sort((a, b) => {
      const aVal = varyingKey === 'x' ? a.centerX : a.centerY;
      const bVal = varyingKey === 'x' ? b.centerX : b.centerY;
      return aVal - bVal;
    });

    // Calculate mode position (most common anchor position)
    const anchorPositions = sorted.map(e => anchorKey === 'y' ? e.centerY : e.centerX);
    const modePosition = calculateMode(anchorPositions, config.SPACING_BUCKET_SIZE);

    // Calculate spacings between consecutive items
    const spacings: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = varyingKey === 'x' ? sorted[i - 1].centerX : sorted[i - 1].centerY;
      const curr = varyingKey === 'x' ? sorted[i].centerX : sorted[i].centerY;
      spacings.push(curr - prev);
    }

    const modeSpacing = spacings.length > 0
      ? calculateMode(spacings, config.SPACING_BUCKET_SIZE)
      : 0;

    // Build clustered items with deviation info
    // FIXED: Only check anchor axis deviation - move outliers to the mode, not force rigid spacing
    const clusteredItems: ClusteredItem[] = sorted.map((itemWithCenter) => {
      const currentPosition = varyingKey === 'x' ? itemWithCenter.centerX : itemWithCenter.centerY;
      const anchorPosition = anchorKey === 'y' ? itemWithCenter.centerY : itemWithCenter.centerX;

      // FIXED: Only check if anchor position deviates from mode (where majority are)
      // Don't enforce rigid spacing - just align the anchor axis
      const anchorDeviation = Math.abs(anchorPosition - modePosition);
      const isMisaligned = anchorDeviation > config.MISALIGNMENT_THRESHOLD;

      return {
        item: itemWithCenter.item,
        centerX: itemWithCenter.centerX,
        centerY: itemWithCenter.centerY,
        currentPosition,
        anchorPosition,
        expectedPosition: currentPosition, // Keep current position on varying axis
        deviation: anchorDeviation,
        isMisaligned,
      };
    });

    // Create legacy ClusteredElement array for backward compat
    const clusteredElements: ClusteredElement[] = clusteredItems
      .filter(ci => ci.item.itemType === 'element' && ci.item.originalElement)
      .map(ci => ({
        element: ci.item.originalElement!,
        centerX: ci.centerX,
        centerY: ci.centerY,
        currentPosition: ci.currentPosition,
        anchorPosition: ci.anchorPosition,
        expectedPosition: ci.expectedPosition,
        deviation: ci.deviation,
        isMisaligned: ci.isMisaligned,
      }));

    clusters.push({
      id: `${axis}-${anchorBucket}`,
      type: axis === 'y' ? 'row' : 'column',
      anchorPosition: anchorBucket,
      modePosition,
      modeSpacing,
      items: clusteredItems,
      elements: clusteredElements,
    });
  });

  return clusters;
}

/**
 * Main pattern detection function
 * Now accepts both warehouse elements and optional route markers (cart parking only)
 */
export function detectPatterns(
  elements: WarehouseElement[],
  routeMarkers?: RouteMarker[],
  config: typeof AUTO_ALIGN_CONFIG = AUTO_ALIGN_CONFIG
): PatternDetectionResult {
  // Filter to alignable elements (exclude text, lines, arrows)
  const alignableElements = elements.filter(
    e => e.element_type === 'bay' || e.element_type === 'flow_rack' || e.element_type === 'full_pallet'
  );

  // Filter to cart parking markers only
  const cartParkingMarkers = (routeMarkers || []).filter(
    m => m.marker_type === 'cart_parking'
  );

  // Convert to unified alignable items
  const alignableItems: AlignableItem[] = [
    ...alignableElements.map(elementToAlignableItem),
    ...cartParkingMarkers.map(markerToAlignableItem),
  ];

  if (alignableItems.length < 2) {
    return {
      rows: [],
      columns: [],
      totalMisaligned: 0,
      misalignedItems: [],
      misalignedElements: [],
      orphans: alignableItems,
      orphanElements: alignableElements,
    };
  }

  // Calculate centers for all items
  const itemCenters: ItemWithCenter[] = alignableItems.map(item => ({
    item,
    ...getItemCenter(item),
  }));

  // Cluster by Y-coordinate to find rows
  const rows = clusterByAxis(itemCenters, 'y', config);

  // Cluster by X-coordinate to find columns
  const columns = clusterByAxis(itemCenters, 'x', config);

  // Find orphan items (not in any pattern)
  const clusteredIds = new Set([
    ...rows.flatMap(r => r.items.map(ci => ci.item.id)),
    ...columns.flatMap(c => c.items.map(ci => ci.item.id)),
  ]);
  const orphans = alignableItems.filter(item => !clusteredIds.has(item.id));
  const orphanElements = orphans
    .filter(o => o.itemType === 'element' && o.originalElement)
    .map(o => o.originalElement!);

  // Collect all misaligned items with their target positions
  const misalignedItems: MisalignedItem[] = [];
  const processedIds = new Set<string>();

  // Process rows first (priority)
  // Process rows - for rows (clustered by Y), only move Y to modePosition, keep X unchanged
  rows.forEach(row => {
    row.items.forEach((ci) => {
      if (ci.isMisaligned && !processedIds.has(ci.item.id)) {
        // FIXED: Only align Y to modePosition, keep X unchanged
        const targetX = ci.item.x_coordinate;  // Keep X as-is
        const targetY = row.modePosition - ci.item.height / 2;  // Align Y to mode

        misalignedItems.push({
          item: ci.item,
          cluster: row,
          currentX: ci.item.x_coordinate,
          currentY: ci.item.y_coordinate,
          targetX,
          targetY,
          deviationX: 0,  // No X change
          deviationY: Math.abs(ci.item.y_coordinate - targetY),
        });
        processedIds.add(ci.item.id);
      }
    });
  });

  // Process columns - for columns (clustered by X), only move X to modePosition, keep Y unchanged
  columns.forEach(col => {
    col.items.forEach((ci) => {
      if (ci.isMisaligned && !processedIds.has(ci.item.id)) {
        // FIXED: Only align X to modePosition, keep Y unchanged
        const targetX = col.modePosition - ci.item.width / 2;  // Align X to mode
        const targetY = ci.item.y_coordinate;  // Keep Y as-is

        misalignedItems.push({
          item: ci.item,
          cluster: col,
          currentX: ci.item.x_coordinate,
          currentY: ci.item.y_coordinate,
          targetX,
          targetY,
          deviationX: Math.abs(ci.item.x_coordinate - targetX),
          deviationY: 0,  // No Y change
        });
        processedIds.add(ci.item.id);
      }
    });
  });

  // Create legacy misalignedElements for backward compat
  const misalignedElements: MisalignedElement[] = misalignedItems
    .filter(mi => mi.item.itemType === 'element' && mi.item.originalElement)
    .map(mi => ({
      element: mi.item.originalElement!,
      cluster: mi.cluster,
      currentX: mi.currentX,
      currentY: mi.currentY,
      targetX: mi.targetX,
      targetY: mi.targetY,
      deviationX: mi.deviationX,
      deviationY: mi.deviationY,
    }));

  return {
    rows,
    columns,
    totalMisaligned: misalignedItems.length,
    misalignedItems,
    misalignedElements,
    orphans,
    orphanElements,
  };
}

/**
 * Generate correction plan from detection result
 */
export function generateCorrectionPlan(
  detection: PatternDetectionResult
): CorrectionPlan {
  const corrections: ElementCorrection[] = detection.misalignedItems.map(mi => ({
    elementId: mi.item.id,
    elementLabel: mi.item.label,
    itemType: mi.item.itemType,
    originalX: mi.currentX,
    originalY: mi.currentY,
    targetX: Math.round(mi.targetX),
    targetY: Math.round(mi.targetY),
    deltaX: Math.round(mi.targetX - mi.currentX),
    deltaY: Math.round(mi.targetY - mi.currentY),
  }));

  const maxDeviation = corrections.length > 0
    ? Math.max(...corrections.map(c => Math.max(Math.abs(c.deltaX), Math.abs(c.deltaY))))
    : 0;

  // Count total alignable items
  const totalElements = new Set([
    ...detection.rows.flatMap(r => r.items.map(ci => ci.item.id)),
    ...detection.columns.flatMap(c => c.items.map(ci => ci.item.id)),
  ]).size + detection.orphans.length;

  return {
    corrections,
    totalElements,
    totalMisaligned: corrections.length,
    estimatedMaxDeviation: maxDeviation,
    rowCount: detection.rows.length,
    columnCount: detection.columns.length,
  };
}

/**
 * Convert correction plan to format expected by handleMultiElementUpdate
 * Returns only element corrections (not markers)
 */
export function correctionsToUpdates(
  corrections: ElementCorrection[]
): Array<{ id: string; changes: { x_coordinate: number; y_coordinate: number } }> {
  return corrections
    .filter(c => !c.itemType || c.itemType === 'element')
    .map(c => ({
      id: c.elementId,
      changes: {
        x_coordinate: c.targetX,
        y_coordinate: c.targetY,
      },
    }));
}

/**
 * Get marker corrections from correction plan
 */
export function correctionsToMarkerUpdates(
  corrections: ElementCorrection[]
): Array<{ id: string; x_coordinate: number; y_coordinate: number }> {
  return corrections
    .filter(c => c.itemType === 'marker')
    .map(c => ({
      id: c.elementId,
      x_coordinate: c.targetX,
      y_coordinate: c.targetY,
    }));
}
