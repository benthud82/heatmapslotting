import { AggregatedPickData, AggregatedItemPickData, CapacityAwareReslottingOpportunity } from './types';

/**
 * Export element-level aggregated pick data as CSV
 */
export function exportElementDataCSV(
    data: AggregatedPickData[],
    layoutName: string,
    dateRange?: { start: string; end: string }
): void {
    if (!data.length) {
        alert('No data to export');
        return;
    }

    // Calculate velocity tiers
    const maxPicks = Math.max(...data.map(d => d.total_picks));
    const withTiers = data.map(d => ({
        ...d,
        velocityTier: getVelocityTier(d.total_picks, maxPicks)
    }));

    // Sort by total picks descending
    withTiers.sort((a, b) => b.total_picks - a.total_picks);

    // Build CSV content
    const headers = [
        'element_name',
        'total_picks',
        'days_count',
        'avg_picks_per_day',
        'round_trip_distance_ft',
        'velocity_tier',
        'first_date',
        'last_date'
    ];

    const rows = withTiers.map(d => [
        escapeCSVField(d.element_name),
        d.total_picks,
        d.days_count,
        d.days_count > 0 ? (d.total_picks / d.days_count).toFixed(1) : '0',
        d.roundTripDistanceFeet ?? '',
        d.velocityTier,
        d.first_date,
        d.last_date
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Generate filename with date range if available
    const dateStr = dateRange
        ? `_${dateRange.start}_to_${dateRange.end}`
        : `_${new Date().toISOString().split('T')[0]}`;
    const filename = `velocity-analysis-elements_${sanitizeFilename(layoutName)}${dateStr}.csv`;

    downloadCSV(csvContent, filename);
}

/**
 * Export item-level aggregated pick data as CSV
 */
export function exportItemDataCSV(
    data: AggregatedItemPickData[],
    layoutName: string,
    dateRange?: { start: string; end: string }
): void {
    if (!data.length) {
        alert('No data to export');
        return;
    }

    // Calculate velocity tiers
    const maxPicks = Math.max(...data.map(d => d.total_picks));
    const withTiers = data.map(d => ({
        ...d,
        velocityTier: getVelocityTier(d.total_picks, maxPicks),
        avgPicksPerDay: d.days_count > 0 ? d.total_picks / d.days_count : 0
    }));

    // Sort by total picks descending
    withTiers.sort((a, b) => b.total_picks - a.total_picks);

    // Build CSV content
    const headers = [
        'rank',
        'item_id',
        'item_description',
        'location_id',
        'element_name',
        'element_type',
        'total_picks',
        'days_count',
        'avg_picks_per_day',
        'round_trip_distance_ft',
        'velocity_tier'
    ];

    const rows = withTiers.map((d, idx) => [
        idx + 1,
        escapeCSVField(d.external_item_id || d.item_id),
        escapeCSVField(d.item_description || ''),
        escapeCSVField(d.external_location_id || d.location_id),
        escapeCSVField(d.element_name),
        d.element_type,
        d.total_picks,
        d.days_count,
        d.avgPicksPerDay.toFixed(1),
        d.roundTripDistanceFeet ?? '',
        d.velocityTier
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Generate filename with date range if available
    const dateStr = dateRange
        ? `_${dateRange.start}_to_${dateRange.end}`
        : `_${new Date().toISOString().split('T')[0]}`;
    const filename = `velocity-analysis-items_${sanitizeFilename(layoutName)}${dateStr}.csv`;

    downloadCSV(csvContent, filename);
}

/**
 * Determine velocity tier based on picks relative to max
 */
function getVelocityTier(picks: number, maxPicks: number): 'A' | 'B' | 'C' {
    const ratio = picks / maxPicks;
    if (ratio >= 0.5) return 'A';  // Top 50% of max = High velocity
    if (ratio >= 0.2) return 'B';  // 20-50% of max = Medium velocity
    return 'C';                     // Below 20% = Low velocity
}

/**
 * Escape a field for CSV (handle commas, quotes, newlines)
 */
function escapeCSVField(value: string | undefined | null): string {
    if (value === undefined || value === null) return '';
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Sanitize a string for use in filename
 */
function sanitizeFilename(name: string): string {
    return name
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);
}

/**
 * Trigger browser download of CSV content
 */
function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export approved reslotting moves as a CSV plan
 * Walking speed: 264 ft/min (3 mph)
 */
export function exportReslottingPlan(
    approvedMoves: CapacityAwareReslottingOpportunity[],
    layoutName: string
): void {
    if (!approvedMoves.length) {
        alert('No approved moves to export');
        return;
    }

    const headers = [
        'item_id',
        'item_description',
        'current_location',
        'current_element_type',
        'current_distance_ft',
        'target_location',
        'target_element_type',
        'target_distance_ft',
        'daily_savings_ft',
        'daily_savings_min',
        'total_picks',
        'avg_daily_picks',
        'velocity_tier',
        'velocity_percentile',
        'move_type',
        'swap_with_item_id',
        'swap_item_picks_per_day'
    ];

    const rows = approvedMoves.map(move => {
        const target = move.targetElements[0];
        const currentDistFt = Math.round(move.currentElement.distance / 12);
        const targetDistFt = target ? Math.round(target.distance / 12) : '';
        const dailySavingsFt = move.totalDailyWalkSavings;
        const dailySavingsMin = (dailySavingsFt / 264).toFixed(2);

        // Swap info
        const moveType = move.moveType || 'unknown';
        const swapWithItemId = target?.swapSuggestion?.coldItem.externalItemId || '';
        const swapItemPicksPerDay = target?.swapSuggestion?.coldItem.avgDailyPicks?.toFixed(1) || '';

        return [
            escapeCSVField(move.item.externalItemId),
            escapeCSVField(move.item.itemDescription || ''),
            escapeCSVField(move.currentElement.name),
            move.currentElement.type,
            currentDistFt,
            escapeCSVField(target?.name || ''),
            target?.type || '',
            targetDistFt,
            dailySavingsFt.toFixed(1),
            dailySavingsMin,
            move.item.totalPicks,
            move.item.avgDailyPicks.toFixed(1),
            move.item.velocityTier,
            move.item.percentile.toFixed(0),
            moveType,
            escapeCSVField(swapWithItemId),
            swapItemPicksPerDay
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const filename = `reslotting-plan_${sanitizeFilename(layoutName)}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
}
