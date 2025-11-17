/**
 * Heatmap Color Utilities
 * Provides color gradient functions for warehouse pick intensity visualization
 */

// Color gradient stops for the heatmap
// Maps pick intensity from low (blue) to high (red)
export const HEATMAP_GRADIENT_COLORS = [
  '#3b82f6', // Blue (0-20%)
  '#06b6d4', // Cyan (20-40%)
  '#10b981', // Green (40-60%)
  '#fbbf24', // Yellow (60-80%)
  '#f97316', // Orange (80-100%)
  '#ef4444', // Red (100%)
] as const;

/**
 * Maps a pick count to a heatmap color based on min/max range
 * @param picks - The pick count for a specific location
 * @param minPicks - Minimum pick count in the dataset
 * @param maxPicks - Maximum pick count in the dataset
 * @returns Hex color string representing the pick intensity
 */
export function getHeatmapColor(picks: number, minPicks: number, maxPicks: number): string {
  if (maxPicks === minPicks) {
    return HEATMAP_GRADIENT_COLORS[0]; // Blue if all same value
  }

  // Normalize pick count to 0-1 range
  const normalized = (picks - minPicks) / (maxPicks - minPicks);

  // Color scale: blue → cyan → green → yellow → orange → red
  if (normalized < 0.2) {
    // Blue → Cyan (0-20%)
    const t = normalized / 0.2;
    return interpolateColor(HEATMAP_GRADIENT_COLORS[0], HEATMAP_GRADIENT_COLORS[1], t);
  } else if (normalized < 0.4) {
    // Cyan → Green (20-40%)
    const t = (normalized - 0.2) / 0.2;
    return interpolateColor(HEATMAP_GRADIENT_COLORS[1], HEATMAP_GRADIENT_COLORS[2], t);
  } else if (normalized < 0.6) {
    // Green → Yellow (40-60%)
    const t = (normalized - 0.4) / 0.2;
    return interpolateColor(HEATMAP_GRADIENT_COLORS[2], HEATMAP_GRADIENT_COLORS[3], t);
  } else if (normalized < 0.8) {
    // Yellow → Orange (60-80%)
    const t = (normalized - 0.6) / 0.2;
    return interpolateColor(HEATMAP_GRADIENT_COLORS[3], HEATMAP_GRADIENT_COLORS[4], t);
  } else {
    // Orange → Red (80-100%)
    const t = (normalized - 0.8) / 0.2;
    return interpolateColor(HEATMAP_GRADIENT_COLORS[4], HEATMAP_GRADIENT_COLORS[5], t);
  }
}

/**
 * Interpolates between two hex colors
 * @param color1 - Starting hex color (e.g., '#3b82f6')
 * @param color2 - Ending hex color (e.g., '#06b6d4')
 * @param factor - Interpolation factor between 0 and 1
 * @returns Interpolated hex color string
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Generates a CSS linear gradient string for the heatmap color scale
 * @returns CSS gradient string for vertical display
 */
export function getHeatmapGradientCSS(): string {
  return `linear-gradient(to top, ${HEATMAP_GRADIENT_COLORS.join(', ')})`;
}
