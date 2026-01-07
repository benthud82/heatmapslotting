'use client';

import DateRangePicker from '@/components/DateRangePicker';

type ComparisonPeriod = 'week' | 'month' | 'quarter' | 'custom';

interface DashboardFilterBarProps {
    startDate: string;
    endDate: string;
    selectedPeriod: ComparisonPeriod;
    availableDates: string[];
    onPeriodChange: (period: ComparisonPeriod) => void;
    onDateRangeChange: (start: string, end: string) => void;
    onClear: () => void;
}

export default function DashboardFilterBar({
    startDate,
    endDate,
    selectedPeriod,
    availableDates,
    onPeriodChange,
    onDateRangeChange,
    onClear,
}: DashboardFilterBarProps) {
    const periods = [
        { key: 'week' as const, label: 'This Week' },
        { key: 'month' as const, label: 'This Month' },
        { key: 'quarter' as const, label: 'This Quarter' },
    ];

    const handleDateChange = (start: string, end: string) => {
        onDateRangeChange(start, end);
        // Automatically switch to custom period when user picks dates
        if (start || end) {
            onPeriodChange('custom');
        }
    };

    return (
        <div className="bg-slate-900/50 border-b border-slate-800">
            <div className="w-full max-w-[1800px] mx-auto px-6 py-3">
                <div className="flex items-center gap-8 flex-wrap">
                    {/* Period selection and Date picker grouped together */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-500 mr-2">Period:</span>
                        {periods.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => onPeriodChange(key)}
                                className={`px-4 py-2 text-sm font-mono rounded-lg transition-colors ${selectedPeriod === key
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-slate-500">Custom Range:</span>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onChange={handleDateChange}
                            availableDates={availableDates}
                        />
                        {selectedPeriod === 'custom' && (startDate || endDate) && (
                            <button
                                onClick={onClear}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-mono text-sm rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
