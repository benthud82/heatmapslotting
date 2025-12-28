import * as XLSX from 'xlsx';

export interface ParsedRow {
    [key: string]: string | number;
}

export interface ExcelParseResult {
    rows: ParsedRow[];
    headers: string[];
    sheetName: string;
}

/**
 * Check if a file is an Excel file based on extension
 */
export function isExcelFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'xlsx' || ext === 'xls';
}

/**
 * Parse an Excel file and return rows with normalized headers
 * Headers are lowercased and spaces are replaced with underscores
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) {
                    reject(new Error('No sheets found in Excel file'));
                    return;
                }

                const sheet = workbook.Sheets[sheetName];

                // Convert to JSON with raw values
                const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
                    raw: false,  // Get formatted strings
                    defval: ''   // Default empty values
                });

                if (rawRows.length === 0) {
                    resolve({
                        rows: [],
                        headers: [],
                        sheetName
                    });
                    return;
                }

                // Get original headers and normalize them
                const originalHeaders = Object.keys(rawRows[0]);
                const normalizedHeaders = originalHeaders.map(h =>
                    h.trim().toLowerCase().replace(/\s+/g, '_')
                );

                // Create header mapping
                const headerMap = new Map<string, string>();
                originalHeaders.forEach((original, i) => {
                    headerMap.set(original, normalizedHeaders[i]);
                });

                // Normalize all rows
                const normalizedRows: ParsedRow[] = rawRows.map(row => {
                    const newRow: ParsedRow = {};
                    for (const [originalKey, value] of Object.entries(row)) {
                        const normalizedKey = headerMap.get(originalKey) || originalKey;
                        // Ensure value is string or number
                        if (typeof value === 'string' || typeof value === 'number') {
                            newRow[normalizedKey] = value;
                        } else {
                            newRow[normalizedKey] = String(value ?? '');
                        }
                    }
                    return newRow;
                });

                resolve({
                    rows: normalizedRows,
                    headers: normalizedHeaders,
                    sheetName
                });
            } catch (error) {
                reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Convert Excel date serial number to YYYY-MM-DD string
 * Excel stores dates as numbers (days since 1900-01-01)
 */
export function excelDateToString(excelDate: number | string): string {
    if (typeof excelDate === 'string') {
        // Already a string, check if it's a valid date format
        if (/^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
            return excelDate;
        }
        // Try to parse other date formats
        const parsed = new Date(excelDate);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
        return excelDate;
    }

    if (typeof excelDate === 'number') {
        // Excel date serial number
        // Excel's epoch is 1900-01-01, but there's a bug where it thinks 1900 was a leap year
        const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
        const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
        return jsDate.toISOString().split('T')[0];
    }

    return String(excelDate);
}
