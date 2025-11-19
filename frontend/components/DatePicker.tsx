import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    availableDates?: string[];
    label?: string;
    placeholder?: string;
}

export default function DatePicker({
    value,
    onChange,
    availableDates = [],
    label,
    placeholder = 'Select date'
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize current month from value if present
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setCurrentMonth(date);
            }
        }
    }, [value]);

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

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
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
        onChange(formatDate(date));
        setIsOpen(false);
    };

    const isDateAvailable = (date: Date) => {
        return availableDates.includes(formatDate(date));
    };

    const isSelected = (date: Date) => {
        return value === formatDate(date);
    };

    const isToday = (date: Date) => {
        return formatDate(date) === formatDate(new Date());
    };

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-xs font-mono text-slate-400 mb-1">
                    {label}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center justify-between px-3 py-2 bg-slate-800 border rounded cursor-pointer transition-colors
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-600 hover:border-slate-500'}
        `}
            >
                <span className={`text-sm font-mono ${value ? 'text-white' : 'text-slate-500'}`}>
                    {value || placeholder}
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-medium text-white font-mono">
                            {monthName}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 p-2 border-b border-slate-800/50 bg-slate-900/30">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1 p-2">
                        {days.map((date, index) => {
                            if (!date) return <div key={`empty-${index}`} />;

                            const available = isDateAvailable(date);
                            const selected = isSelected(date);
                            const today = isToday(date);

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleDateClick(date)}
                                    className={`
                    relative h-8 w-8 rounded-md flex items-center justify-center text-xs font-mono transition-all
                    ${selected
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                            : 'text-slate-300 hover:bg-slate-800'
                                        }
                    ${today && !selected ? 'ring-1 ring-slate-600' : ''}
                    ${available && !selected ? 'font-bold text-white' : ''}
                  `}
                                >
                                    {date.getDate()}

                                    {/* Indicator for available data */}
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

                    {/* Legend */}
                    <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-800 flex items-center gap-3 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></div>
                            <span>Has Data</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                            <span>Selected</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
