// Template definitions for warehouse layouts
import { ElementType, RouteMarkerType } from '../types';

export interface TemplateElement {
  element_type: ElementType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TemplateRouteMarker {
  marker_type: RouteMarkerType;
  label: string;
  x_coordinate: number;
  y_coordinate: number;
  sequence_order?: number;
}

export interface WarehouseTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  icon?: string;
  category: 'full-warehouse' | 'zone' | 'quick-start';
  canvasWidth: number;
  canvasHeight: number;
  elements: TemplateElement[];
  routeMarkers: TemplateRouteMarker[];
}

// Helper function to generate a quick grid layout
function generateQuickGrid(cols: number, rows: number, spacing: number): TemplateElement[] {
  const elements: TemplateElement[] = [];
  const bayWidth = 48;
  const bayHeight = 96;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col + 1;
      elements.push({
        element_type: 'bay',
        label: `B${index}`,
        x_coordinate: 100 + col * spacing,
        y_coordinate: 100 + row * spacing,
        width: bayWidth,
        height: bayHeight,
        rotation: 0,
      });
    }
  }
  return elements;
}

// Quick Grid template - most common starting point
const quickGridTemplate: WarehouseTemplate = {
  id: 'quick-grid',
  name: 'Quick Grid (3x5)',
  description: '15 bays in a simple grid. Perfect for small warehouses.',
  thumbnail: '',
  icon: '▦',
  category: 'quick-start',
  canvasWidth: 1200,
  canvasHeight: 800,
  elements: generateQuickGrid(3, 5, 120),
  routeMarkers: [
    { marker_type: 'start_point', label: 'Start', x_coordinate: 50, y_coordinate: 300, sequence_order: 1 },
    { marker_type: 'stop_point', label: 'Stop', x_coordinate: 500, y_coordinate: 300, sequence_order: 2 },
  ],
};

// Import templates
import uShaped from './u-shaped.json';
import iShaped from './i-shaped.json';
import lShaped from './l-shaped.json';
import flowRackZone from './flow-rack-zone.json';
import palletStorage from './pallet-storage.json';

export const templates: WarehouseTemplate[] = [
  quickGridTemplate,
  uShaped as WarehouseTemplate,
  iShaped as WarehouseTemplate,
  lShaped as WarehouseTemplate,
  flowRackZone as WarehouseTemplate,
  palletStorage as WarehouseTemplate,
];

export const getTemplateById = (id: string): WarehouseTemplate | undefined => {
  return templates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: 'full-warehouse' | 'zone'): WarehouseTemplate[] => {
  return templates.filter(t => t.category === category);
};
