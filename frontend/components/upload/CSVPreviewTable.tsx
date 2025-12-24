import React from 'react';
import { ValidatedRow, ItemValidatedRow } from '@/lib/csvValidation';

interface CSVPreviewTableProps {
    rows: ValidatedRow[];
    itemRows?: ItemValidatedRow[];
    format?: 'element-level' | 'item-level';
    maxRows?: number;
}

export default function CSVPreviewTable({ rows, itemRows, format = 'element-level', maxRows = 10 }: CSVPreviewTableProps) {
    const isItemLevel = format === 'item-level' && itemRows && itemRows.length > 0;
    const displayRows = isItemLevel ? itemRows.slice(0, maxRows) : rows.slice(0, maxRows);
    const totalRows = isItemLevel ? itemRows.length : rows.length;
    const hasMore = totalRows > maxRows;

    if (isItemLevel && itemRows) {
        // Item-level table
        return (
            <div className="w-full overflow-hidden border border-slate-700 rounded-lg shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Status
                                </th>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Item ID
                                </th>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Location ID
                                </th>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Element
                                </th>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Date
                                </th>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Picks
                                </th>
                                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                    Issues
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900 divide-y divide-slate-800">
                            {(displayRows as ItemValidatedRow[]).map((row, idx) => (
                                <tr key={idx} className={row.isValid ? 'hover:bg-slate-800' : 'bg-red-900/20 hover:bg-red-900/30'}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {row.isValid ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                                Valid
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                                Error
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-white font-mono whitespace-nowrap">
                                        {row.original.item_id}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300 font-mono whitespace-nowrap">
                                        {row.original.location_id}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300 font-mono whitespace-nowrap">
                                        {row.original.element_name}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                                        {row.original.date}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400 tabular-nums whitespace-nowrap">
                                        {row.original.pick_count}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-red-400">
                                        {row.errors.length > 0 && (
                                            <ul className="list-disc list-inside text-xs">
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
                                    <td colSpan={7} className="px-4 py-8 text-sm text-center text-slate-500">
                                        No data to preview
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {hasMore && (
                    <div className="px-4 py-3 text-sm text-center text-slate-500 bg-slate-800 border-t border-slate-700">
                        Showing first {maxRows} of {totalRows} rows
                    </div>
                )}
            </div>
        );
    }

    // Element-level table (legacy)
    return (
        <div className="w-full overflow-hidden border border-slate-700 rounded-lg shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-800">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                Status
                            </th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                Element Name
                            </th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                Date
                            </th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                Pick Count
                            </th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-400 uppercase">
                                Issues
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-slate-900 divide-y divide-slate-800">
                        {(displayRows as ValidatedRow[]).map((row, idx) => (
                            <tr key={idx} className={row.isValid ? 'hover:bg-slate-800' : 'bg-red-900/20 hover:bg-red-900/30'}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {row.isValid ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                            Valid
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                            Error
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-white font-mono whitespace-nowrap">
                                    {row.original.element_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                                    {row.original.date}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400 tabular-nums whitespace-nowrap">
                                    {row.original.pick_count}
                                </td>
                                <td className="px-4 py-3 text-sm text-red-400">
                                    {row.errors.length > 0 && (
                                        <ul className="list-disc list-inside text-xs">
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
                                <td colSpan={5} className="px-4 py-8 text-sm text-center text-slate-500">
                                    No data to preview
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {hasMore && (
                <div className="px-4 py-3 text-sm text-center text-slate-500 bg-slate-800 border-t border-slate-700">
                    Showing first {maxRows} of {totalRows} rows
                </div>
            )}
        </div>
    );
}
