import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { FeedingRecord } from '../types';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  records: FeedingRecord[];
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange, records }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const recordDates = useMemo(() => {
      return new Set(records.map(r => new Date(r.timestamp).toDateString()));
  }, [records]);

  useLayoutEffect(() => {
    if (scrollContainerRef.current && todayRef.current) {
        const container = scrollContainerRef.current;
        const today = todayRef.current;
        const containerWidth = container.offsetWidth;
        const todayWidth = today.offsetWidth;
        const todayOffset = today.offsetLeft;
        
        container.scrollLeft = todayOffset - (containerWidth / 2) + (todayWidth / 2);
    }
  }, []);

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
  }

  return (
    <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-2 py-2 mb-4 snap-x snap-mandatory no-scrollbar">
      {dates.map(date => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        const hasRecord = recordDates.has(date.toDateString());

        return (
          <button
            key={date.toISOString()}
            ref={isToday ? todayRef : null}
            onClick={() => onDateChange(date)}
            className={`snap-center flex-shrink-0 w-16 text-center rounded-xl p-2 transition-all relative ${isSelected ? 'bg-rose-500 text-white' : 'bg-white'}`}
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
