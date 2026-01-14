import React, { useRef, useEffect, useMemo } from 'react';
import { FeedingRecord } from '../types';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  records: FeedingRecord[];
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange, records }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef<HTMLButtonElement>(null);

  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const recordDates = useMemo(() => {
      return new Set(records.map(r => new Date(r.timestamp).toDateString()));
  }, [records]);

  useEffect(() => {
    if (selectedDateRef.current) {
        selectedDateRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDate]);

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
  }

  return (
    <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-2 py-2 mb-4 no-scrollbar">
      {dates.map(date => {
        const isSelected = isSameDay(date, selectedDate);
        const hasRecord = recordDates.has(date.toDateString());

        return (
          <button
            key={date.toISOString()}
            ref={isSelected ? selectedDateRef : null}
            onClick={() => onDateChange(date)}
            className={`flex-shrink-0 w-16 text-center rounded-xl p-2 transition-all relative ${isSelected ? 'bg-rose-500 text-white' : 'bg-white'}`}
          >
            <p className={`text-xs font-medium ${isSelected ? 'text-rose-100' : 'text-zinc-400'}`}>{date.toLocaleString('en-US', { weekday: 'short' })}</p>
            <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-zinc-800'}`}>{date.getDate()}</p>
            {hasRecord && <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${isSelected ? 'bg-white' : 'bg-rose-500'} rounded-full`}></div>}
          </button>
        );
      })}
    </div>
  );
};

export default DateSelector;
