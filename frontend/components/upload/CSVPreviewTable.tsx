import React from 'react';
import { ValidatedRow } from '@/lib/csvValidation';

interface CSVPreviewTableProps {
    rows: ValidatedRow[];
    maxRows?: number;
}

export default function CSVPreviewTable({ rows, maxRows = 10 }: CSVPreviewTableProps) {
    const displayRows = rows.slice(0, maxRows);
    const hasMore = rows.length > maxRows;

    return (
        <div className="w-full overflow-hidden border border-gray-200 rounded-lg shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                                Element Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                                Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                                Pick Count
                            </th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                                Issues
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayRows.map((row, idx) => (
                            <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50 hover:bg-red-100'}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {row.isValid ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Valid
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Error
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                    {row.original.element_name}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                    {row.original.date}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                    {row.original.pick_count}
                                </td>
                                <td className="px-6 py-4 text-sm text-red-600">
                                    {row.errors.length > 0 && (
                                        <ul className="list-disc list-inside">
                                            {row.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {displayRows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-sm text-center text-gray-500">
                                    No data to preview
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {hasMore && (
                <div className="px-6 py-3 text-sm text-center text-gray-500 bg-gray-50 border-t border-gray-200">
                    Showing first {maxRows} of {rows.length} rows
                </div>
            )}
        </div>
    );
}
