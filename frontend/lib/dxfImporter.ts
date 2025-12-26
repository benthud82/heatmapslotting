import DxfParser from 'dxf-parser';
import { ElementType, ELEMENT_CONFIGS } from './types';

// DXF entity type - using interface for type safety while allowing dynamic properties
export interface DxfEntity {
  type: string;
  vertices?: Array<{ x: number; y: number }>;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  center?: { x: number; y: number };
  radius?: number;
  text?: string;
  textString?: string;
  string?: string;
  position?: { x: number; y: number };
  startX?: number;
  startY?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  [key: string]: unknown; // Allow dynamic properties from DXF parser
}

export interface ImportedElement {
  element_type: ElementType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  rotation: number;
}

export interface DxfImportResult {
  elements: ImportedElement[];
  warnings: string[];
  stats: {
    totalEntities: number;
    convertedEntities: number;
    skippedEntities: number;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
  };
}

// DXF uses millimeters typically, we use inches (1 pixel = 1 inch)
const MM_TO_INCHES = 0.0393701;

// Scale factor to fit typical warehouse layouts into canvas
const DEFAULT_SCALE = 1;

export function parseDxfFile(fileContent: string): DxfImportResult {
  const parser = new DxfParser();
  const warnings: string[] = [];
  const elements: ImportedElement[] = [];

  let dxf;
  try {
    dxf = parser.parseSync(fileContent);
  } catch (err) {
    throw new Error(`Failed to parse DXF file: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  if (!dxf || !dxf.entities) {
    throw new Error('DXF file contains no entities');
  }

  // Calculate bounds for normalization
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // First pass: calculate bounds
  for (const rawEntity of dxf.entities) {
    // Cast to our DxfEntity type for type-safe access
    const entity = rawEntity as unknown as DxfEntity;
    if (entity.vertices) {
      for (const v of entity.vertices) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      }
    }
    if (entity.startPoint) {
      minX = Math.min(minX, entity.startPoint.x);
      minY = Math.min(minY, entity.startPoint.y);
      maxX = Math.max(maxX, entity.startPoint.x);
      maxY = Math.max(maxY, entity.startPoint.y);
    }
    if (entity.endPoint) {
      minX = Math.min(minX, entity.endPoint.x);
      minY = Math.min(minY, entity.endPoint.y);
      maxX = Math.max(maxX, entity.endPoint.x);
      maxY = Math.max(maxY, entity.endPoint.y);
    }
    if (entity.position) {
      minX = Math.min(minX, entity.position.x);
      minY = Math.min(minY, entity.position.y);
      maxX = Math.max(maxX, entity.position.x);
      maxY = Math.max(maxY, entity.position.y);
    }
    if (entity.center) {
      const r = (entity.radius as number) || 0;
      minX = Math.min(minX, entity.center.x - r);
      minY = Math.min(minY, entity.center.y - r);
      maxX = Math.max(maxX, entity.center.x + r);
      maxY = Math.max(maxY, entity.center.y + r);
    }
  }

  // Calculate scale to fit within reasonable canvas size
  const dxfWidth = maxX - minX;
  const dxfHeight = maxY - minY;
  const targetWidth = 1200;
  const targetHeight = 800;
  const scale = Math.min(targetWidth / dxfWidth, targetHeight / dxfHeight, 1) * 0.8;

  // Offset to position content with padding
  // We need to flip Y axis: CAD uses Y-up, canvas uses Y-down
  const offsetX = 100 - minX * scale;
  // For Y: we flip by using maxY as reference point
  const flipY = maxY;

  // Label counters
  const labelCounters: Record<string, number> = {
    bay: 0,
    flow_rack: 0,
    full_pallet: 0,
    text: 0,
    line: 0,
    arrow: 0,
  };

  let convertedCount = 0;
  let skippedCount = 0;

  // Second pass: convert entities
  for (const rawEntity of dxf.entities) {
    // Cast to our DxfEntity type for type-safe access
    const entity = rawEntity as unknown as DxfEntity;
    try {
      const converted = convertEntity(entity, scale, offsetX, flipY, labelCounters);
      if (converted) {
        elements.push(converted);
        convertedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      warnings.push(`Failed to convert ${entity.type}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      skippedCount++;
    }
  }

  if (elements.length === 0) {
    warnings.push('No compatible entities found in DXF file. Try a file with LWPOLYLINE, LINE, or TEXT entities.');
  }

  return {
    elements,
    warnings,
    stats: {
      totalEntities: dxf.entities.length,
      convertedEntities: convertedCount,
      skippedEntities: skippedCount,
      bounds: {
        minX: minX * scale + offsetX,
        minY: (flipY - maxY) * scale + 100,
        maxX: maxX * scale + offsetX,
        maxY: (flipY - minY) * scale + 100,
      },
    },
  };
}

function convertEntity(
  entity: DxfEntity,
  scale: number,
  offsetX: number,
  flipY: number,
  labelCounters: Record<string, number>
): ImportedElement | null {
  switch (entity.type) {
    case 'LINE':
      return convertLine(entity, scale, offsetX, flipY, labelCounters);

    case 'LWPOLYLINE':
    case 'POLYLINE':
      return convertPolyline(entity, scale, offsetX, flipY, labelCounters);

    case 'TEXT':
    case 'MTEXT':
      return convertText(entity, scale, offsetX, flipY, labelCounters);

    case 'CIRCLE':
      // Skip circles for now - could be converted to markers in future
      return null;

    case 'INSERT':
      // Block references - skip for now
      return null;

    default:
      // Unknown entity type
      return null;
  }
}

function convertLine(
  entity: DxfEntity,
  scale: number,
  offsetX: number,
  flipY: number,
  labelCounters: Record<string, number>
): ImportedElement | null {
  if (!entity.startPoint || !entity.endPoint) return null;

  const x1 = entity.startPoint.x * scale + offsetX;
  const y1 = (flipY - entity.startPoint.y) * scale + 100;
  const x2 = entity.endPoint.x * scale + offsetX;
  const y2 = (flipY - entity.endPoint.y) * scale + 100;

  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  // Very short lines become nothing
  if (width < 5 && height < 5) return null;

  // Primarily horizontal or vertical lines become line elements
  labelCounters.line++;

  return {
    element_type: 'line',
    label: `L${labelCounters.line}`,
    x_coordinate: Math.min(x1, x2),
    y_coordinate: Math.min(y1, y2),
    width: Math.max(width, 2),
    height: Math.max(height, 2),
    rotation: 0,
  };
}

function convertPolyline(
  entity: DxfEntity,
  scale: number,
  offsetX: number,
  flipY: number,
  labelCounters: Record<string, number>
): ImportedElement | null {
  if (!entity.vertices || entity.vertices.length < 2) return null;

  // Calculate bounding box with Y-flip
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of entity.vertices) {
    const x = v.x * scale + offsetX;
    const y = (flipY - v.y) * scale + 100;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  // Very small shapes - skip
  if (width < 10 && height < 10) return null;

  // Determine element type based on dimensions
  let elementType: ElementType;
  let label: string;

  // Check if it's roughly the size of a known element
  const bayConfig = ELEMENT_CONFIGS.bay;
  const palletConfig = ELEMENT_CONFIGS.full_pallet;
  const flowRackConfig = ELEMENT_CONFIGS.flow_rack;

  // Use aspect ratio and size to guess element type
  const aspectRatio = width / height;

  if (width > 80 && height > 80) {
    // Large rectangle - flow rack
    elementType = 'flow_rack';
    labelCounters.flow_rack++;
    label = `FR${labelCounters.flow_rack}`;
  } else if (width >= 30 && height >= 30) {
    // Medium rectangle - pallet
    elementType = 'full_pallet';
    labelCounters.full_pallet++;
    label = `P${labelCounters.full_pallet}`;
  } else {
    // Small rectangle - bay
    elementType = 'bay';
    labelCounters.bay++;
    label = `B${labelCounters.bay}`;
  }

  const config = ELEMENT_CONFIGS[elementType];

  return {
    element_type: elementType,
    label,
    x_coordinate: minX,
    y_coordinate: minY,
    width: config.width,
    height: config.height,
    rotation: 0,
  };
}

function convertText(
  entity: DxfEntity,
  scale: number,
  offsetX: number,
  flipY: number,
  labelCounters: Record<string, number>
): ImportedElement | null {
  // Try multiple possible property names for text content
  const textContent = entity.text || entity.textString || entity.string || (entity as Record<string, unknown>)['1'] as string;

  // Try multiple possible property names for position
  let posX: number | undefined;
  let posY: number | undefined;

  if (entity.position) {
    posX = entity.position.x;
    posY = entity.position.y;
  } else if (entity.startPoint) {
    posX = entity.startPoint.x;
    posY = entity.startPoint.y;
  } else if (entity.x !== undefined && entity.y !== undefined) {
    posX = entity.x;
    posY = entity.y;
  } else {
    // Check for raw DXF group codes
    const rawX = (entity as Record<string, unknown>)['10'] as number;
    const rawY = (entity as Record<string, unknown>)['20'] as number;
    if (rawX !== undefined && rawY !== undefined) {
      posX = rawX;
      posY = rawY;
    }
  }

  if (posX === undefined || posY === undefined || !textContent) {
    return null;
  }

  const x = posX * scale + offsetX;
  const y = (flipY - posY) * scale + 100;

  labelCounters.text++;

  return {
    element_type: 'text',
    label: String(textContent).substring(0, 50), // Limit label length
    x_coordinate: x,
    y_coordinate: y,
    width: ELEMENT_CONFIGS.text.width,
    height: ELEMENT_CONFIGS.text.height,
    rotation: 0,
  };
}

// Validate file is a DXF
export function validateDxfFile(content: string): boolean {
  // DXF files typically start with "0" followed by "SECTION"
  const lines = content.trim().split('\n');
  if (lines.length < 2) return false;

  const firstLine = lines[0].trim();
  const secondLine = lines[1].trim();

  return firstLine === '0' && secondLine === 'SECTION';
}
