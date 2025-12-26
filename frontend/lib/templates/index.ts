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
  category: 'full-warehouse' | 'zone';
  canvasWidth: number;
  canvasHeight: number;
  elements: TemplateElement[];
  routeMarkers: TemplateRouteMarker[];
}

// Import templates
import uShaped from './u-shaped.json';
import iShaped from './i-shaped.json';
import lShaped from './l-shaped.json';
import flowRackZone from './flow-rack-zone.json';
import palletStorage from './pallet-storage.json';

export const templates: WarehouseTemplate[] = [
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
