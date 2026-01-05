// Pattern Generator Utility Functions
// Handles position calculations, naming patterns, and warehouse-specific numbering directions

export type NumberingDirection = 'serpentine' | 'sequential_rows' | 'sequential_cols' | 'cross_aisle';
export type PatternType = 'row' | 'column' | 'grid';

export interface PatternConfig {
  type: PatternType;
  rows: number;
  columns: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  namingPattern: string;
  numberingDirection: NumberingDirection;
  startRow: number;
  startCol: number;
}

export interface GeneratedPosition {
  x: number;
  y: number;
  row: number;
  col: number;
  sequenceNumber: number;
}

export interface TemplateElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedPattern {
  pattern: string;
  startNumber: number;
  prefix: string;
  suffix: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: string[];
}

/**
 * Generates the sequence of numbers based on the numbering direction
 * This is the core algorithm that determines how elements are numbered
 */
export function getNumberSequence(
  rows: number,
  cols: number,
  direction: NumberingDirection
): number[][] {
  const grid: number[][] = [];
  let counter = 1;

  switch (direction) {
    case 'serpentine':
      // Snake pattern: left-to-right, then right-to-left alternating
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) {
          row.push(counter++);
        }
        // Reverse every other row
        if (r % 2 === 1) {
          row.reverse();
        }
        grid.push(row);
      }
      break;

    case 'sequential_rows':
      // Each row uses the same column numbers (1, 2, 3...)
      // Row number changes per row
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) {
          row.push(c + 1);
        }
        grid.push(row);
      }
      break;

    case 'sequential_cols':
      // Each column uses the same row numbers (1, 2, 3...)
      // Column number changes per column
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) {
          row.push(r + 1);
        }
        grid.push(row);
      }
      break;

    case 'cross_aisle':
      // Odd numbers on first row, even on second, etc.
      // Pattern: 1,3,5,7 / 2,4,6,8 / 9,11,13,15 / 10,12,14,16
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        const pairIndex = Math.floor(r / 2);
        const isOddRow = r % 2 === 0;
        const baseNumber = pairIndex * cols * 2;

        for (let c = 0; c < cols; c++) {
          if (isOddRow) {
            // Odd numbers: 1, 3, 5, 7...
            row.push(baseNumber + (c * 2) + 1);
          } else {
            // Even numbers: 2, 4, 6, 8...
            row.push(baseNumber + (c * 2) + 2);
          }
        }
        grid.push(row);
      }
      break;
  }

  return grid;
}

/**
 * Generates positions for all elements in the pattern
 */
export function generatePositions(
  template: TemplateElement,
  config: PatternConfig
): GeneratedPosition[] {
  const positions: GeneratedPosition[] = [];
  const sequence = getNumberSequence(config.rows, config.columns, config.numberingDirection);

  const effectiveRows = config.type === 'row' ? 1 : config.rows;
  const effectiveCols = config.type === 'column' ? 1 : config.columns;

  for (let r = 0; r < effectiveRows; r++) {
    for (let c = 0; c < effectiveCols; c++) {
      const x = template.x + c * (template.width + config.horizontalSpacing);
      const y = template.y + r * (template.height + config.verticalSpacing);

      positions.push({
        x,
        y,
        row: r + 1,
        col: c + 1,
        sequenceNumber: sequence[r]?.[c] ?? (r * effectiveCols + c + 1),
      });
    }
  }

  return positions;
}

/**
 * Formats a number with the specified padding
 */
function formatNumber(num: number, padding: number): string {
  return String(num).padStart(padding, '0');
}

/**
 * Converts a number to letter sequence (A, B, C... Z, AA, AB...)
 */
function numberToLetters(num: number): string {
  let result = '';
  let n = num;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result || 'A';
}

/**
 * Generates labels based on the naming pattern and positions
 */
export function generateLabels(
  pattern: string,
  positions: GeneratedPosition[],
  config: PatternConfig
): string[] {
  const labels: string[] = [];

  for (const pos of positions) {
    let label = pattern;

    // Replace {ROW} with actual row number (with optional padding)
    label = label.replace(/\{ROW(#+)?\}/gi, (_, hashes) => {
      const padding = hashes ? hashes.length : 0;
      const rowNum = pos.row + config.startRow - 1;
      return padding > 0 ? formatNumber(rowNum, padding) : String(rowNum);
    });

    // Replace {COL} with actual column number (with optional padding)
    label = label.replace(/\{COL(#+)?\}/gi, (_, hashes) => {
      const padding = hashes ? hashes.length : 0;
      const colNum = pos.col + config.startCol - 1;
      return padding > 0 ? formatNumber(colNum, padding) : String(colNum);
    });

    // Replace {A}, {AA}, etc. with letter sequences
    label = label.replace(/\{(A+)\}/g, (_, letters) => {
      // Use sequence number for letter generation
      return numberToLetters(pos.sequenceNumber);
    });

    // Replace {#}, {##}, {###} etc. with sequence numbers
    label = label.replace(/\{(#+)\}/g, (_, hashes) => {
      const padding = hashes.length;
      const num = pos.sequenceNumber + config.startCol - 1;
      return padding > 1 ? formatNumber(num, padding) : String(num);
    });

    labels.push(label);
  }

  return labels;
}

/**
 * Validates generated labels against existing labels
 */
export function validateLabels(
  newLabels: string[],
  existingLabels: string[]
): ValidationResult {
  const existingSet = new Set(existingLabels.map(l => l.toLowerCase()));
  const newSet = new Set<string>();
  const conflicts: string[] = [];

  for (const label of newLabels) {
    const lowerLabel = label.toLowerCase();

    // Check against existing labels
    if (existingSet.has(lowerLabel)) {
      conflicts.push(label);
    }

    // Check for duplicates within new labels
    if (newSet.has(lowerLabel)) {
      if (!conflicts.includes(label)) {
        conflicts.push(label);
      }
    }

    newSet.add(lowerLabel);
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Attempts to detect a naming pattern from an existing label
 * E.g., "A-01-05" -> { pattern: "A-{##}-{##}", startNumber: 1 }
 */
export function detectNamingPattern(label: string): DetectedPattern {
  // Try to find number patterns in the label
  const numberMatch = label.match(/^([A-Za-z\-_]*)(\d+)(.*)$/);

  if (numberMatch) {
    const [, prefix, number, suffix] = numberMatch;
    const padding = number.length;
    const startNumber = parseInt(number, 10);

    // Check if suffix contains more numbers
    const suffixMatch = suffix.match(/^([^0-9]*)(\d+)(.*)$/);
    if (suffixMatch) {
      const [, sep, num2, rest] = suffixMatch;
      const padding2 = num2.length;
      const pattern = `${prefix}{${'#'.repeat(padding)}}${sep}{${'#'.repeat(padding2)}}${rest}`;
      return { pattern, startNumber, prefix, suffix };
    }

    const pattern = `${prefix}{${'#'.repeat(padding)}}${suffix}`;
    return { pattern, startNumber, prefix, suffix };
  }

  // If no number found, return a simple pattern
  return {
    pattern: `${label}-{##}`,
    startNumber: 1,
    prefix: label,
    suffix: '',
  };
}

/**
 * Sorts elements by their spatial position based on numbering direction
 * Used by the Re-sequence feature to rename elements based on position
 */
export function sortElementsByPosition<T extends { x: number; y: number }>(
  elements: T[],
  direction: NumberingDirection,
  tolerance: number = 10
): T[] {
  // First, group elements into rows based on Y coordinate (with tolerance)
  const rows: T[][] = [];
  const sorted = [...elements].sort((a, b) => a.y - b.y);

  for (const element of sorted) {
    // Find existing row within tolerance
    let foundRow = rows.find(row => {
      const rowY = row[0].y;
      return Math.abs(element.y - rowY) <= tolerance;
    });

    if (foundRow) {
      foundRow.push(element);
    } else {
      rows.push([element]);
    }
  }

  // Sort each row by X coordinate
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }

  // Now apply numbering direction logic
  const result: T[] = [];

  switch (direction) {
    case 'serpentine':
      // Alternate row direction
      rows.forEach((row, index) => {
        if (index % 2 === 1) {
          result.push(...row.reverse());
        } else {
          result.push(...row);
        }
      });
      break;

    case 'sequential_rows':
    case 'sequential_cols':
      // Just flatten in row order
      rows.forEach(row => result.push(...row));
      break;

    case 'cross_aisle':
      // Interleave odd/even rows
      for (let i = 0; i < rows.length; i += 2) {
        const oddRow = rows[i] || [];
        const evenRow = rows[i + 1] || [];

        // Interleave elements
        const maxLen = Math.max(oddRow.length, evenRow.length);
        for (let j = 0; j < maxLen; j++) {
          if (oddRow[j]) result.push(oddRow[j]);
          if (evenRow[j]) result.push(evenRow[j]);
        }
      }
      break;
  }

  return result;
}

/**
 * Detects the grid structure from a set of elements
 * Returns the detected number of rows and columns
 */
export function detectGridStructure<T extends { x: number; y: number }>(
  elements: T[],
  tolerance: number = 10
): { rows: number; columns: number } {
  if (elements.length === 0) {
    return { rows: 0, columns: 0 };
  }

  // Group by Y coordinate to find rows
  const uniqueYs = new Set<number>();
  const sorted = [...elements].sort((a, b) => a.y - b.y);

  let lastY = sorted[0].y;
  uniqueYs.add(lastY);

  for (const element of sorted) {
    if (Math.abs(element.y - lastY) > tolerance) {
      lastY = element.y;
      uniqueYs.add(lastY);
    }
  }

  // Group by X coordinate to find columns
  const uniqueXs = new Set<number>();
  const sortedByX = [...elements].sort((a, b) => a.x - b.x);

  let lastX = sortedByX[0].x;
  uniqueXs.add(lastX);

  for (const element of sortedByX) {
    if (Math.abs(element.x - lastX) > tolerance) {
      lastX = element.x;
      uniqueXs.add(lastX);
    }
  }

  return {
    rows: uniqueYs.size,
    columns: uniqueXs.size,
  };
}

/**
 * Direction display info for UI
 */
export const DIRECTION_INFO: Record<NumberingDirection, {
  name: string;
  description: string;
  example: string[][];
}> = {
  serpentine: {
    name: 'Serpentine',
    description: 'Snake pattern - numbers flow continuously, reversing each row',
    example: [
      ['1', '2', '3', '→'],
      ['←', '6', '5', '4'],
      ['7', '8', '9', '→'],
    ],
  },
  sequential_rows: {
    name: 'Sequential Rows',
    description: 'Each row restarts numbering - use with Row/Col pattern',
    example: [
      ['1', '2', '3', '→'],
      ['1', '2', '3', '→'],
      ['1', '2', '3', '→'],
    ],
  },
  sequential_cols: {
    name: 'Sequential Columns',
    description: 'Each column increments independently',
    example: [
      ['1', '1', '1', '↓'],
      ['2', '2', '2', '↓'],
      ['3', '3', '3', '↓'],
    ],
  },
  cross_aisle: {
    name: 'Cross-Aisle',
    description: 'Odd numbers on one side, even on other - for double-sided aisles',
    example: [
      ['1', '3', '5', '7'],
      ['2', '4', '6', '8'],
    ],
  },
};















