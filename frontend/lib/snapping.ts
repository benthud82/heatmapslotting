import { WarehouseElement } from './types';

// Snap configuration constants
export const SNAP_THRESHOLD = 8; // Pixels distance to trigger snap
export const ELEMENT_GAP = 2; // Pixels gap between elements when snapping

/**
 * Interface for element edges and center points
 */
interface ElementEdges {
  left: number;
  right: number;
  centerX: number;
  top: number;
  bottom: number;
  centerY: number;
}

/**
 * Interface for snap calculation result
 */
export interface SnapResult {
  snapX: number | null;
  snapY: number | null;
}

/**
 * Calculate the Axis-Aligned Bounding Box (AABB) for a rotated rectangle
 */
const getRotatedAABB = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number = 0
): ElementEdges => {
  if (rotation === 0) {
    return {
      left: x,
      right: x + width,
      centerX: x + width / 2,
      top: y,
      bottom: y + height,
      centerY: y + height / 2,
    };
  }

  // Convert rotation to radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Calculate center of the rectangle (pivot point)
  const cx = x + width / 2;
  const cy = y + height / 2;

  // Calculate the 4 corners relative to center, then rotate, then translate back
  // Corners: top-left, top-right, bottom-right, bottom-left
  // Relative coordinates before rotation:
  // TL: -w/2, -h/2
  // TR: w/2, -h/2
  // BR: w/2, h/2
  // BL: -w/2, h/2

  const hw = width / 2;
  const hh = height / 2;

  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map(p => ({
    x: cx + (p.x * cos - p.y * sin),
    y: cy + (p.x * sin + p.y * cos)
  }));

  // Find min/max X and Y
  const minX = Math.min(...corners.map(p => p.x));
  const maxX = Math.max(...corners.map(p => p.x));
  const minY = Math.min(...corners.map(p => p.y));
  const maxY = Math.max(...corners.map(p => p.y));

  return {
    left: minX,
    right: maxX,
    centerX: cx, // Center remains the same
    top: minY,
    bottom: maxY,
    centerY: cy, // Center remains the same
  };
};

/**
 * Calculate edge positions and centers for an element
 * Includes gap offset for edge-to-edge snapping
 */
export const getElementEdges = (element: WarehouseElement): ElementEdges => {
  return getRotatedAABB(
    Number(element.x_coordinate),
    Number(element.y_coordinate),
    Number(element.width),
    Number(element.height),
    Number(element.rotation || 0)
  );
};

/**
 * Calculate edge positions for the currently dragged element
 */
const getDraggedElementEdges = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number = 0
): ElementEdges => {
  return getRotatedAABB(x, y, width, height, rotation);
};

/**
 * Check if two axis-aligned bounding boxes overlap
 */
const doAABBsOverlap = (a: ElementEdges, b: ElementEdges): boolean => {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
};

/**
 * Check if a ghost element would overlap with any existing elements
 * Returns true if there's a collision (element cannot be placed)
 */
export const checkElementCollision = (
  ghostElement: { x: number; y: number; width: number; height: number; rotation?: number },
  existingElements: WarehouseElement[]
): boolean => {
  if (existingElements.length === 0) return false;

  const ghostEdges = getDraggedElementEdges(
    ghostElement.x,
    ghostElement.y,
    ghostElement.width,
    ghostElement.height,
    ghostElement.rotation ?? 0
  );

  for (const element of existingElements) {
    const elementEdges = getElementEdges(element);
    if (doAABBsOverlap(ghostEdges, elementEdges)) {
      return true;
    }
  }

  return false;
};

/**
 * Find snap points for a dragged element against all other elements
 * Returns snap coordinates if within threshold, null otherwise
 */
export const findSnapPoints = (
  draggedElement: { x: number; y: number; width: number; height: number; rotation?: number },
  otherElements: WarehouseElement[],
  threshold: number = SNAP_THRESHOLD
): SnapResult => {
  const result: SnapResult = {
    snapX: null,
    snapY: null,
  };

  if (otherElements.length === 0) {
    return result;
  }

  const dragEdges = getDraggedElementEdges(
    draggedElement.x,
    draggedElement.y,
    draggedElement.width,
    draggedElement.height,
    draggedElement.rotation || 0
  );

  let minXDiff = threshold;
  let minYDiff = threshold;

  // Check each element for potential snap points
  otherElements.forEach((element) => {
    const targetEdges = getElementEdges(element);

    // X-axis snap points (vertical alignment)
    const xSnapCandidates = [
      // Left edge of dragged element to left edge of target
      { dragPoint: dragEdges.left, targetPoint: targetEdges.left, offset: dragEdges.left - draggedElement.x },
      // Left edge of dragged element to right edge of target (with gap)
      {
        dragPoint: dragEdges.left,
        targetPoint: targetEdges.right + ELEMENT_GAP,
        offset: dragEdges.left - draggedElement.x,
      },
      // Right edge of dragged element to left edge of target (with gap)
      {
        dragPoint: dragEdges.right,
        targetPoint: targetEdges.left - ELEMENT_GAP,
        offset: dragEdges.right - draggedElement.x,
      },
      // Right edge of dragged element to right edge of target
      {
        dragPoint: dragEdges.right,
        targetPoint: targetEdges.right,
        offset: dragEdges.right - draggedElement.x,
      },
      // Center of dragged element to center of target
      {
        dragPoint: dragEdges.centerX,
        targetPoint: targetEdges.centerX,
        offset: dragEdges.centerX - draggedElement.x,
      },
    ];

    xSnapCandidates.forEach(({ dragPoint, targetPoint, offset }) => {
      const diff = Math.abs(dragPoint - targetPoint);
      if (diff < minXDiff) {
        minXDiff = diff;
        // We need to calculate the new X position for the top-left corner of the unrotated shape
        // such that the specific edge aligns.
        // snapX is the new top-left X coordinate.
        // targetPoint is where we want the specific edge (dragPoint) to be.
        // offset is the distance from the top-left X to that edge.
        // So: newTopLeftX + offset = targetPoint => newTopLeftX = targetPoint - offset
        result.snapX = targetPoint - offset;
      }
    });

    // Y-axis snap points (horizontal alignment)
    const ySnapCandidates = [
      // Top edge of dragged element to top edge of target
      { dragPoint: dragEdges.top, targetPoint: targetEdges.top, offset: dragEdges.top - draggedElement.y },
      // Top edge of dragged element to bottom edge of target (with gap)
      {
        dragPoint: dragEdges.top,
        targetPoint: targetEdges.bottom + ELEMENT_GAP,
        offset: dragEdges.top - draggedElement.y,
      },
      // Bottom edge of dragged element to top edge of target (with gap)
      {
        dragPoint: dragEdges.bottom,
        targetPoint: targetEdges.top - ELEMENT_GAP,
        offset: dragEdges.bottom - draggedElement.y,
      },
      // Bottom edge of dragged element to bottom edge of target
      {
        dragPoint: dragEdges.bottom,
        targetPoint: targetEdges.bottom,
        offset: dragEdges.bottom - draggedElement.y,
      },
      // Center of dragged element to center of target
      {
        dragPoint: dragEdges.centerY,
        targetPoint: targetEdges.centerY,
        offset: dragEdges.centerY - draggedElement.y,
      },
    ];

    ySnapCandidates.forEach(({ dragPoint, targetPoint, offset }) => {
      const diff = Math.abs(dragPoint - targetPoint);
      if (diff < minYDiff) {
        minYDiff = diff;
        result.snapY = targetPoint - offset;
      }
    });
  });

  return result;
};

/**
 * Clamp element position to stay within canvas bounds
 */
export const clampToCanvas = (
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  return {
    x: Math.max(0, Math.min(x, canvasWidth - width)),
    y: Math.max(0, Math.min(y, canvasHeight - height)),
  };
};

// Rotation snap configuration constants
export const ROTATION_SNAP_ANGLE = 45; // Snap to 45° increments
export const ROTATION_THRESHOLD = 5; // Degrees within which to trigger snap

/**
 * Snap rotation angle to nearest 45° increment
 * Angles: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
 */
export const snapRotation = (angle: number): number => {
  // Normalize angle to 0-360 range
  const normalized = ((angle % 360) + 360) % 360;

  // Find nearest 45° increment
  const nearestAngle = Math.round(normalized / ROTATION_SNAP_ANGLE) * ROTATION_SNAP_ANGLE;

  // Calculate difference from nearest snap angle
  const diff = Math.abs(normalized - nearestAngle);

  // If within threshold, snap to nearest angle
  if (diff <= ROTATION_THRESHOLD) {
    return nearestAngle % 360;
  }

  // Otherwise, return normalized angle (no snap)
  return normalized;
};
