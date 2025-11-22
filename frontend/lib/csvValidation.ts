/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from 'papaparse';

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
