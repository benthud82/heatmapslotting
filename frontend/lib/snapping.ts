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
 * Calculate edge positions and centers for an element
 * Includes gap offset for edge-to-edge snapping
 */
export const getElementEdges = (element: WarehouseElement): ElementEdges => {
  const x = Number(element.x_coordinate);
  const y = Number(element.y_coordinate);
  const w = Number(element.width);
  const h = Number(element.height);

  return {
    left: x,
    right: x + w,
    centerX: x + w / 2,
    top: y,
    bottom: y + h,
    centerY: y + h / 2,
  };
};

/**
 * Calculate edge positions for the currently dragged element
 */
const getDraggedElementEdges = (
  x: number,
  y: number,
  width: number,
  height: number
): ElementEdges => {
  return {
    left: x,
    right: x + width,
    centerX: x + width / 2,
    top: y,
    bottom: y + height,
    centerY: y + height / 2,
  };
};

/**
 * Find snap points for a dragged element against all other elements
 * Returns snap coordinates if within threshold, null otherwise
 */
export const findSnapPoints = (
  draggedElement: { x: number; y: number; width: number; height: number },
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
    draggedElement.height
  );

  let minXDiff = threshold;
  let minYDiff = threshold;

  // Check each element for potential snap points
  otherElements.forEach((element) => {
    const targetEdges = getElementEdges(element);

    // X-axis snap points (vertical alignment)
    const xSnapCandidates = [
      // Left edge of dragged element to left edge of target
      { dragPoint: dragEdges.left, targetPoint: targetEdges.left, offset: 0 },
      // Left edge of dragged element to right edge of target (with gap)
      {
        dragPoint: dragEdges.left,
        targetPoint: targetEdges.right + ELEMENT_GAP,
        offset: 0,
      },
      // Right edge of dragged element to left edge of target (with gap)
      {
        dragPoint: dragEdges.right,
        targetPoint: targetEdges.left - ELEMENT_GAP,
        offset: draggedElement.width,
      },
      // Right edge of dragged element to right edge of target
      {
        dragPoint: dragEdges.right,
        targetPoint: targetEdges.right,
        offset: draggedElement.width,
      },
      // Center of dragged element to center of target
      {
        dragPoint: dragEdges.centerX,
        targetPoint: targetEdges.centerX,
        offset: draggedElement.width / 2,
      },
    ];

    xSnapCandidates.forEach(({ dragPoint, targetPoint, offset }) => {
      const diff = Math.abs(dragPoint - targetPoint);
      if (diff < minXDiff) {
        minXDiff = diff;
        result.snapX = targetPoint - offset;
      }
    });

    // Y-axis snap points (horizontal alignment)
    const ySnapCandidates = [
      // Top edge of dragged element to top edge of target
      { dragPoint: dragEdges.top, targetPoint: targetEdges.top, offset: 0 },
      // Top edge of dragged element to bottom edge of target (with gap)
      {
        dragPoint: dragEdges.top,
        targetPoint: targetEdges.bottom + ELEMENT_GAP,
        offset: 0,
      },
      // Bottom edge of dragged element to top edge of target (with gap)
      {
        dragPoint: dragEdges.bottom,
        targetPoint: targetEdges.top - ELEMENT_GAP,
        offset: draggedElement.height,
      },
      // Bottom edge of dragged element to bottom edge of target
      {
        dragPoint: dragEdges.bottom,
        targetPoint: targetEdges.bottom,
        offset: draggedElement.height,
      },
      // Center of dragged element to center of target
      {
        dragPoint: dragEdges.centerY,
        targetPoint: targetEdges.centerY,
        offset: draggedElement.height / 2,
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
