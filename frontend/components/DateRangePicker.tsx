import React, { useState, useEffect, useRef } from 'react';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
    availableDates?: string[];
    placeholder?: string;
}

export default function DateRangePicker({
    startDate,
    endDate,
    onChange,
    availableDates = [],
    placeholder = 'Select date range'
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize current month from startDate if present
    useEffect(() => {
        if (startDate) {
            const date = new Date(startDate);
            if (!isNaN(date.getTime())) {
                setCurrentMonth(date);
            }
        }
    }, [startDate]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysInMonth = (year: number, month: number) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        const days = [];
        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (date: Date) => {
        const dateStr = formatDate(date);

        if (!startDate || (startDate && endDate)) {
            // Start a new range
            onChange(dateStr, '');
        } else {
            // Complete the range
            const start = new Date(startDate);
            if (date < start) {
                // If clicked date is before start, make it the new start
                onChange(dateStr, '');
            } else {
                onChange(startDate, dateStr);
                setIsOpen(false);
            }
        }
    };

    const isDateAvailable = (date: Date) => {
        return availableDates.includes(formatDate(date));
    };

    const isSelected = (date: Date) => {
        const dateStr = formatDate(date);
        return startDate === dateStr || endDate === dateStr;
    };

    const isInRange = (date: Date) => {
        if (!startDate) return false;
        const start = new Date(startDate);
        const current = date;

        if (endDate) {
            const end = new Date(endDate);
            return current > start && current < end;
        }

        if (hoverDate) {
            return current > start && current < hoverDate;
        }

        return false;
    };

    const isRangeStart = (date: Date) => formatDate(date) === startDate;
    const isRangeEnd = (date: Date) => formatDate(date) === endDate;

    const renderMonth = (offset: number) => {
        const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
        const days = getDaysInMonth(monthDate.getFullYear(), monthDate.getMonth());
        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        return (
            <div className="w-64">
                <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50">
                    {offset === 0 ? (
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    ) : <div className="w-6" />}

                    <span className="text-sm font-medium text-white font-mono">{monthName}</span>

                    {offset === 1 ? (
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ) : <div className="w-6" />}
                </div>

                <div className="grid grid-cols-7 gap-1 p-2 border-b border-slate-800/50 bg-slate-900/30">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 p-2">
                    {days.map((date, index) => {
                        if (!date) return <div key={`empty-${index}`} />;

                        const available = isDateAvailable(date);
                        const selected = isSelected(date);
                        const inRange = isInRange(date);
                        const isStart = isRangeStart(date);
                        const isEnd = isRangeEnd(date);

                        return (
                            <button
                                key={index}
                                onClick={() => handleDateClick(date)}
                                onMouseEnter={() => setHoverDate(date)}
                                onMouseLeave={() => setHoverDate(null)}
                                className={`
                                    relative h-8 w-8 flex items-center justify-center text-xs font-mono transition-all
                                    ${isStart ? 'rounded-l-md' : ''}
                                    ${isEnd ? 'rounded-r-md' : ''}
                                    ${!isStart && !isEnd && !inRange ? 'rounded-md' : ''}
                                    ${selected ? 'bg-blue-600 text-white z-10' : ''}
                                    ${inRange ? 'bg-blue-900/50 text-blue-200' : ''}
                                    ${!selected && !inRange ? 'text-slate-300 hover:bg-slate-800' : ''}
                                    ${available && !selected && !inRange ? 'font-bold text-white' : ''}
                                `}
                            >
                                {date.getDate()}
                                {available && (
                                    <div className={`
                                        absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full
                                        ${selected ? 'bg-white' : 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]'}
                                    `} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 bg-slate-800 border rounded cursor-pointer transition-colors min-w-[240px]
                    ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-600 hover:border-slate-500'}
                `}
            >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`text-sm font-mono ${startDate ? 'text-white' : 'text-slate-500'}`}>
                    {startDate || 'Start Date'}
                </span>
                <span className="text-slate-500">→</span>
                <span className={`text-sm font-mono ${endDate ? 'text-white' : 'text-slate-500'}`}>
                    {endDate || 'End Date'}
                </span>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 flex bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {renderMonth(0)}
                    <div className="w-px bg-slate-800" />
                    {renderMonth(1)}
                </div>
            )}
        </div>
    );
}
