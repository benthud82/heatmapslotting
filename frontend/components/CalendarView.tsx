'use client';

import React, { useMemo } from 'react';

interface CalendarViewProps {
    availableDates: string[];
    startDate: string;
    endDate: string;
    pickData?: Map<string, number>; // Optional: map of date -> total picks
}

export default function CalendarView({ availableDates, startDate, endDate, pickData }: CalendarViewProps) {
    const calendarData = useMemo(() => {
        if (!startDate || !endDate) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Adjust start to the first day of that month
        const calendarStart = new Date(start.getFullYear(), start.getMonth(), 1);
        // Adjust end to the last day of that month
        const calendarEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0);

        const months = [];
        let currentMonth = new Date(calendarStart);

        while (currentMonth <= calendarEnd) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

            const days = [];

            // Padding for empty days at start of month
            for (let i = 0; i < firstDayOfWeek; i++) {
                days.push({ day: null, dateStr: null });
            }

            // Actual days
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                const dateStr = date.toISOString().split('T')[0];
                const hasData = availableDates.includes(dateStr);
                const isMissing = date >= start && date <= end && !hasData;

                days.push({
                    day: d,
                    dateStr,
                    hasData,
                    isMissing,
                    picks: pickData?.get(dateStr)
                });
            }

            months.push({ name: monthName, days });

            // Move to next month
            currentMonth = new Date(year, month + 1, 1);
        }

        return months;
    }, [startDate, endDate, availableDates, pickData]);

    if (!startDate || !endDate) {
        return <div className="text-slate-500 text-center p-4">No date range selected</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {calendarData.map((month, idx) => (
                <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
                    <h4 className="text-slate-300 font-bold mb-3 text-center">{month.name}</h4>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className="text-xs font-mono text-slate-500">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {month.days.map((day, dayIdx) => (
                            <div
                                key={dayIdx}
                                className={`
                  aspect-square flex items-center justify-center text-xs rounded-sm relative group
                  ${!day.day ? 'invisible' : ''}
                  ${day.hasData ? 'bg-green-900/40 text-green-400 border border-green-900' : ''}
                  ${day.isMissing ? 'bg-red-900/20 text-red-400 border border-red-900/50' : ''}
                  ${!day.hasData && !day.isMissing && day.day ? 'text-slate-600' : ''}
                `}
                                title={day.dateStr ? `${day.dateStr}${day.picks ? `: ${day.picks} picks` : ''}` : ''}
                            >
                                {day.day}

                                {/* Tooltip */}
                                {day.day && (day.hasData || day.isMissing) && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-max">
                                        <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded border border-slate-700 shadow-xl">
                                            <div className="font-bold">{day.dateStr}</div>
                                            {day.hasData ? (
                                                <div className="text-green-400">Data Available</div>
                                            ) : (
                                                <div className="text-red-400">Missing Data</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
