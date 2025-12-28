/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from 'papaparse';

// =============================================================================
// FILE TYPE DETECTION
// =============================================================================

/**
 * Check if a file is an Excel file based on extension
 */
export function isExcelFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'xlsx' || ext === 'xls';
}

/**
 * Check if a file is a CSV file based on extension
 */
export function isCSVFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'csv';
}

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
    suggestions?: Map<string, string>; // Map of original -> suggested element names
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
    suggestions?: Map<string, string>; // Map of original -> suggested element names
}

export interface ItemValidatedRow {
    original: ItemCSVRow;
    isValid: boolean;
    errors: string[];
    elementId?: string;
}

export const ITEM_REQUIRED_COLUMNS = ['item_id', 'location_id', 'element_name', 'date', 'pick_count'];

// =============================================================================
// FUZZY MATCHING FOR ELEMENT NAMES
// =============================================================================

export interface FuzzyMatch {
    original: string;
    suggested: string;
    score: number;
}

/**
 * Find the best matching element name from valid names
 * Returns null if no good match found (score < 0.6)
 */
export function findBestMatch(input: string, validNames: Set<string>): FuzzyMatch | null {
    const normalized = input.toLowerCase().replace(/[-_\s]/g, '');

    // Extract numeric portion (e.g., "01" from "Bay01" or "1" from "B1")
    const numMatch = normalized.match(/(\d+)/);
    const inputNum = numMatch ? numMatch[1].replace(/^0+/, '') : ''; // Remove leading zeros

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const name of validNames) {
        const nameNorm = name.toLowerCase().replace(/[-_\s]/g, '');
        const nameNum = nameNorm.match(/(\d+)/)?.[1]?.replace(/^0+/, '') || '';

        // Exact match (case-insensitive, ignoring separators)
        if (nameNorm === normalized) {
            return { original: input, suggested: name, score: 1.0 };
        }

        // Number match with same digits (B1 matches Bay1, Bay01, BAY_1, etc.)
        if (inputNum && nameNum && inputNum === nameNum) {
            // Additional check: first letter should match for better accuracy
            const inputFirstLetter = normalized.replace(/[^a-z]/g, '')[0];
            const nameFirstLetter = nameNorm.replace(/[^a-z]/g, '')[0];

            if (inputFirstLetter === nameFirstLetter) {
                const score = 0.9; // High confidence - same number and same prefix letter
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = name;
                }
            } else {
                const score = 0.7; // Medium confidence - just matching numbers
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = name;
                }
            }
        }

        // Prefix/suffix match
        if (normalized.startsWith(nameNorm) || nameNorm.startsWith(normalized)) {
            const score = 0.6;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = name;
            }
        }
    }

    if (bestMatch && bestScore >= 0.6) {
        return { original: input, suggested: bestMatch, score: bestScore };
    }

    return null;
}

/**
 * Find all fuzzy matches for unmatched element names
 */
export function findAllFuzzyMatches(
    unmatchedNames: string[],
    validNames: Set<string>
): Map<string, string> {
    const suggestions = new Map<string, string>();

    for (const name of unmatchedNames) {
        const match = findBestMatch(name, validNames);
        if (match) {
            suggestions.set(match.original, match.suggested);
        }
    }

    return suggestions;
}

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

                // Compute fuzzy match suggestions for unmatched elements
                const unmatchedArray = Array.from(unmatchedElements);
                const suggestions = findAllFuzzyMatches(unmatchedArray, validElementNames);

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
                        unmatchedElements: unmatchedArray.sort()
                    },
                    suggestions: suggestions.size > 0 ? suggestions : undefined
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
        // First, peek at the headers to detect format
        Papa.parse(file, {
            header: true,
            preview: 1, // Only parse first row to get headers
            transformHeader: (h) => h.trim().toLowerCase().replace(/\s/g, '_'),
            complete: async (previewResults) => {
                const headers = previewResults.meta.fields || [];
                const format = detectCSVFormat(headers);

                // If item-level format, delegate to validateItemCSV and adapt result
                if (format === 'item-level') {
                    try {
                        const itemResult = await validateItemCSV(file, validElementNames);
                        // Adapt ItemValidationResult to ValidationResult
                        const adaptedResult: ValidationResult = {
                            isValid: itemResult.isValid,
                            rows: itemResult.rows.map(row => ({
                                original: {
                                    element_name: row.original.element_name,
                                    date: row.original.date,
                                    pick_count: row.original.pick_count,
                                },
                                isValid: row.isValid,
                                errors: row.errors,
                                elementId: row.elementId,
                            })),
                            errors: itemResult.errors,
                            stats: {
                                totalRows: itemResult.stats.totalRows,
                                validRows: itemResult.stats.validRows,
                                invalidRows: itemResult.stats.invalidRows,
                                unmatchedElements: itemResult.stats.unmatchedElements,
                            },
                            suggestions: itemResult.suggestions
                        };
                        resolve(adaptedResult);
                    } catch (error) {
                        reject(error);
                    }
                    return;
                }

                // Otherwise, process as element-level format (original logic)
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
                        const fullHeaders = results.meta.fields || [];
                        const missingColumns = REQUIRED_COLUMNS.filter(col => !fullHeaders.includes(col));

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

                        // Compute fuzzy match suggestions for unmatched elements
                        const unmatchedArray = Array.from(unmatchedElements);
                        const suggestions = findAllFuzzyMatches(unmatchedArray, validElementNames);

                        resolve({
                            isValid: invalidCount === 0 && rows.length > 0,
                            rows: validatedRows,
                            errors: globalErrors,
                            stats: {
                                totalRows: rows.length,
                                validRows: validCount,
                                invalidRows: invalidCount,
                                unmatchedElements: unmatchedArray.sort()
                            },
                            suggestions: suggestions.size > 0 ? suggestions : undefined
                        });
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

// =============================================================================
// VALIDATE ROWS DIRECTLY (FOR EXCEL DATA)
// =============================================================================

/**
 * Validate pre-parsed rows (used for Excel files that are parsed separately)
 */
export function validateParsedRows(
    rows: Record<string, any>[],
    headers: string[],
    validElementNames: Set<string>
): ValidationResult {
    const format = detectCSVFormat(headers);

    if (format === 'unknown') {
        return {
            isValid: false,
            rows: [],
            errors: ['Invalid file format. Expected columns: element_name, date, pick_count (or item_id, location_id, element_name, date, pick_count for item-level)'],
            stats: { totalRows: 0, validRows: 0, invalidRows: 0, unmatchedElements: [] }
        };
    }

    // Check for item-level format
    if (format === 'item-level') {
        return validateParsedItemRows(rows, headers, validElementNames);
    }

    // Element-level validation
    const validatedRows: ValidatedRow[] = [];
    const globalErrors: string[] = [];
    const unmatchedElements = new Set<string>();

    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
        return {
            isValid: false,
            rows: [],
            errors: [`Missing required columns: ${missingColumns.join(', ')}`],
            stats: { totalRows: 0, validRows: 0, invalidRows: 0, unmatchedElements: [] }
        };
    }

    let validCount = 0;
    let invalidCount = 0;

    rows.forEach((row) => {
        const rowErrors: string[] = [];
        const elementName = row.element_name?.toString().trim();
        const date = row.date?.toString().trim();
        const pickCount = parseInt(String(row.pick_count), 10);

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
            original: {
                element_name: elementName || '',
                date: date || '',
                pick_count: row.pick_count
            },
            isValid,
            errors: rowErrors
        });
    });

    // Compute fuzzy match suggestions for unmatched elements
    const unmatchedArray = Array.from(unmatchedElements);
    const suggestions = findAllFuzzyMatches(unmatchedArray, validElementNames);

    return {
        isValid: invalidCount === 0 && rows.length > 0,
        rows: validatedRows,
        errors: globalErrors,
        stats: {
            totalRows: rows.length,
            validRows: validCount,
            invalidRows: invalidCount,
            unmatchedElements: unmatchedArray.sort()
        },
        suggestions: suggestions.size > 0 ? suggestions : undefined
    };
}

/**
 * Validate pre-parsed item-level rows
 */
function validateParsedItemRows(
    rows: Record<string, any>[],
    headers: string[],
    validElementNames: Set<string>
): ValidationResult {
    const validatedRows: ValidatedRow[] = [];
    const globalErrors: string[] = [];
    const unmatchedElements = new Set<string>();
    const uniqueItems = new Set<string>();
    const uniqueLocations = new Set<string>();

    const missingColumns = ITEM_REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
        return {
            isValid: false,
            rows: [],
            errors: [`Missing required columns: ${missingColumns.join(', ')}`],
            stats: { totalRows: 0, validRows: 0, invalidRows: 0, unmatchedElements: [] }
        };
    }

    let validCount = 0;
    let invalidCount = 0;

    rows.forEach((row) => {
        const rowErrors: string[] = [];
        const itemId = row.item_id?.toString().trim();
        const locationId = row.location_id?.toString().trim();
        const elementName = row.element_name?.toString().trim();
        const date = row.date?.toString().trim();
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
            original: {
                element_name: elementName || '',
                date: date || '',
                pick_count: row.pick_count
            },
            isValid,
            errors: rowErrors
        });
    });

    // Compute fuzzy match suggestions for unmatched elements
    const unmatchedArray = Array.from(unmatchedElements);
    const suggestions = findAllFuzzyMatches(unmatchedArray, validElementNames);

    return {
        isValid: invalidCount === 0 && rows.length > 0,
        rows: validatedRows,
        errors: globalErrors,
        stats: {
            totalRows: rows.length,
            validRows: validCount,
            invalidRows: invalidCount,
            unmatchedElements: unmatchedArray.sort()
        },
        suggestions: suggestions.size > 0 ? suggestions : undefined
    };
}
