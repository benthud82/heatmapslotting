/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from 'papaparse';

// =============================================================================
// LEGACY ELEMENT-LEVEL CSV FORMAT
// =============================================================================

export interface CSVRow {
    element_name: string;
    date: string;
    pick_count: string | number;
    [key: string]: any;
}

export interface ValidationResult {
    isValid: boolean;
    rows: ValidatedRow[];
    errors: string[];
    stats: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
        unmatchedElements: string[];
    };
}

export interface ValidatedRow {
    original: CSVRow;
    isValid: boolean;
    errors: string[];
    elementId?: string; // Populated if matched
}

export const REQUIRED_COLUMNS = ['element_name', 'date', 'pick_count'];

// =============================================================================
// NEW ITEM-LEVEL CSV FORMAT
// =============================================================================

export interface ItemCSVRow {
    item_id: string;
    location_id: string;
    element_name: string;
    date: string;
    pick_count: string | number;
    [key: string]: any;
}

export interface ItemValidationResult {
    isValid: boolean;
    rows: ItemValidatedRow[];
    errors: string[];
    format: 'item-level' | 'element-level';
    stats: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
        uniqueItems: number;
        uniqueLocations: number;
        unmatchedElements: string[];
    };
}

export interface ItemValidatedRow {
    original: ItemCSVRow;
    isValid: boolean;
    errors: string[];
    elementId?: string;
}

export const ITEM_REQUIRED_COLUMNS = ['item_id', 'location_id', 'element_name', 'date', 'pick_count'];

/**
 * Detect CSV format based on headers
 */
export function detectCSVFormat(headers: string[]): 'item-level' | 'element-level' | 'unknown' {
    const hasItemColumns = headers.includes('item_id') && headers.includes('location_id');
    const hasElementColumns = headers.includes('element_name') && headers.includes('date') && headers.includes('pick_count');

    if (hasItemColumns && hasElementColumns) {
        return 'item-level';
    } else if (hasElementColumns) {
        return 'element-level';
    }
    return 'unknown';
}

/**
 * Validate item-level CSV format
 */
export const validateItemCSV = (
    file: File,
    validElementNames: Set<string>
): Promise<ItemValidationResult> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase().replace(/\s/g, '_'),
            complete: (results) => {
                const rows = results.data as ItemCSVRow[];
                const validatedRows: ItemValidatedRow[] = [];
                const globalErrors: string[] = [];
                const unmatchedElements = new Set<string>();
                const uniqueItems = new Set<string>();
                const uniqueLocations = new Set<string>();

                // Check headers
                const headers = results.meta.fields || [];
                const format = detectCSVFormat(headers);

                if (format === 'unknown') {
                    resolve({
                        isValid: false,
                        rows: [],
                        errors: ['Invalid CSV format. Expected columns: item_id, location_id, element_name, date, pick_count'],
                        format: 'item-level',
                        stats: { totalRows: 0, validRows: 0, invalidRows: 0, uniqueItems: 0, uniqueLocations: 0, unmatchedElements: [] }
                    });
                    return;
                }

                // If it's element-level format, reject and suggest using item-level
                if (format === 'element-level') {
                    resolve({
                        isValid: false,
                        rows: [],
                        errors: ['This appears to be an element-level CSV. Please use the new item-level format with columns: item_id, location_id, element_name, date, pick_count'],
                        format: 'element-level',
                        stats: { totalRows: 0, validRows: 0, invalidRows: 0, uniqueItems: 0, uniqueLocations: 0, unmatchedElements: [] }
                    });
                    return;
                }

                const missingColumns = ITEM_REQUIRED_COLUMNS.filter(col => !headers.includes(col));

                if (missingColumns.length > 0) {
                    resolve({
                        isValid: false,
                        rows: [],
                        errors: [`Missing required columns: ${missingColumns.join(', ')}`],
                        format: 'item-level',
                        stats: { totalRows: 0, validRows: 0, invalidRows: 0, uniqueItems: 0, uniqueLocations: 0, unmatchedElements: [] }
                    });
                    return;
                }

                let validCount = 0;
                let invalidCount = 0;

                rows.forEach((row) => {
                    const rowErrors: string[] = [];
                    const itemId = row.item_id?.trim();
                    const locationId = row.location_id?.trim();
                    const elementName = row.element_name?.trim();
                    const date = row.date?.trim();
                    const pickCount = parseInt(String(row.pick_count), 10);

                    // Validate Item ID
                    if (!itemId) {
                        rowErrors.push('Missing item_id');
                    } else {
                        uniqueItems.add(itemId);
                    }

                    // Validate Location ID
                    if (!locationId) {
                        rowErrors.push('Missing location_id');
                    } else {
                        uniqueLocations.add(locationId);
                    }

                    // Validate Element Name
                    if (!elementName) {
                        rowErrors.push('Missing element_name');
                    } else if (!validElementNames.has(elementName.toLowerCase())) {
                        unmatchedElements.add(elementName);
                    }

                    // Validate Date (YYYY-MM-DD)
                    if (!date) {
                        rowErrors.push('Missing date');
                    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        rowErrors.push(`Invalid date format "${date}". Expected YYYY-MM-DD`);
                    }

                    // Validate Pick Count
                    if (row.pick_count === undefined || row.pick_count === '') {
                        rowErrors.push('Missing pick_count');
                    } else if (isNaN(pickCount) || pickCount < 0) {
                        rowErrors.push(`Invalid pick_count "${row.pick_count}". Must be a positive integer`);
                    }

                    const isValid = rowErrors.length === 0;
                    if (isValid) validCount++;
                    else invalidCount++;

                    validatedRows.push({
                        original: row,
                        isValid,
                        errors: rowErrors
                    });
                });

                resolve({
                    isValid: invalidCount === 0 && rows.length > 0,
                    rows: validatedRows,
                    errors: globalErrors,
                    format: 'item-level',
                    stats: {
                        totalRows: rows.length,
                        validRows: validCount,
                        invalidRows: invalidCount,
                        uniqueItems: uniqueItems.size,
                        uniqueLocations: uniqueLocations.size,
                        unmatchedElements: Array.from(unmatchedElements).sort()
                    }
                });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

export const validateCSV = (
    file: File,
    validElementNames: Set<string>
): Promise<ValidationResult> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase().replace(/\s/g, '_'),
            complete: (results) => {
                const rows = results.data as CSVRow[];
                const validatedRows: ValidatedRow[] = [];
                const globalErrors: string[] = [];
                const unmatchedElements = new Set<string>();

                // Check headers
                const headers = results.meta.fields || [];
                const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

                if (missingColumns.length > 0) {
                    resolve({
                        isValid: false,
                        rows: [],
                        errors: [`Missing required columns: ${missingColumns.join(', ')}`],
                        stats: { totalRows: 0, validRows: 0, invalidRows: 0, unmatchedElements: [] }
                    });
                    return;
                }

                let validCount = 0;
                let invalidCount = 0;

                rows.forEach((row) => {
                    const rowErrors: string[] = [];
                    const elementName = row.element_name?.trim();
                    const date = row.date?.trim();
                    const pickCount = parseInt(String(row.pick_count), 10);

                    // Validate Element Name
                    if (!elementName) {
                        rowErrors.push('Missing element_name');
                    } else if (!validElementNames.has(elementName.toLowerCase())) {
                        // Track unmatched but don't mark row as invalid
                        unmatchedElements.add(elementName);
                    }

                    // Validate Date (YYYY-MM-DD)
                    if (!date) {
                        rowErrors.push('Missing date');
                    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        rowErrors.push(`Invalid date format "${date}". Expected YYYY-MM-DD`);
                    }

                    // Validate Pick Count
                    if (row.pick_count === undefined || row.pick_count === '') {
                        rowErrors.push('Missing pick_count');
                    } else if (isNaN(pickCount) || pickCount < 0) {
                        rowErrors.push(`Invalid pick_count "${row.pick_count}". Must be a positive integer`);
                    }

                    const isValid = rowErrors.length === 0;
                    if (isValid) validCount++;
                    else invalidCount++;

                    validatedRows.push({
                        original: row,
                        isValid,
                        errors: rowErrors
                    });
                });

                resolve({
                    isValid: invalidCount === 0 && rows.length > 0,
                    rows: validatedRows,
                    errors: globalErrors,
                    stats: {
                        totalRows: rows.length,
                        validRows: validCount,
                        invalidRows: invalidCount,
                        unmatchedElements: Array.from(unmatchedElements).sort()
                    }
                });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
