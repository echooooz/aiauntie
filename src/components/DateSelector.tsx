import React, { useRef, useEffect } from 'react';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  useEffect(() => {
    if (todayRef.current) {
        todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  }, []);

  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
  }

  return (
    <div ref={scrollContainerRef} className="flex overflow-x-auto space-x-2 py-2 mb-4 snap-x snap-mandatory">
      {dates.map(date => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());

        return (
          <button
            key={date.toISOString()}
            ref={isToday ? todayRef : null}
            onClick={() => onDateChange(date)}
            className={`snap-center flex-shrink-0 w-16 text-center rounded-xl p-2 transition-all ${isSelected ? 'bg-rose-500 text-white' : 'bg-white'}`}
          >
            <p className={`text-xs font-medium ${isSelected ? 'text-rose-100' : 'text-zinc-400'}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
            <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-zinc-800'}`}>{date.getDate()}</p>
          </button>
        );
      })}
    </div>
  );
};

export default DateSelector;
