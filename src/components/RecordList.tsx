import React, { useState, useMemo } from 'react';
import { FeedingRecord, RecordType } from '../types';
import DateSelector from './DateSelector';

interface RecordListProps {
  records: FeedingRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: FeedingRecord) => void;
}

type FilterType = 'NURSING' | 'BOTTLE' | 'PUMPING' | null;

const getIcon = (type: RecordType) => {
  switch (type) {
    case RecordType.BOTTLE_FORMULA: return '🍼';
    case RecordType.BOTTLE_MILK: return '💧'; 
    case RecordType.NURSING: return '🤱';
    case RecordType.PUMPING: return '🧴';
    case RecordType.DIAPER: return '🧷';
    case RecordType.SLEEP: return '💤';
    default: return '📝';
  }
};

const getColor = (type: RecordType) => {
    switch (type) {
      case RecordType.BOTTLE_FORMULA: return 'bg-blue-100 text-blue-700 border-blue-200';
      case RecordType.BOTTLE_MILK: return 'bg-sky-100 text-sky-600 border-sky-200';
      case RecordType.NURSING: return 'bg-pink-100 text-pink-700 border-pink-200';
      case RecordType.PUMPING: return 'bg-purple-100 text-purple-700 border-purple-200';
      case RecordType.DIAPER: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case RecordType.SLEEP: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

const getLabel = (record: FeedingRecord) => {
    switch(record.type) {
        case RecordType.BOTTLE_FORMULA: return 'Formula';
        case RecordType.BOTTLE_MILK: return 'Breast Milk';
        case RecordType.NURSING: return 'Nursing';
        case RecordType.PUMPING: return 'Pumping';
        case RecordType.DIAPER: return record.diaperType || 'Diaper';
        case RecordType.SLEEP: return 'Sleep';
        default: return 'Other';
    }
};

const RecordList: React.FC<RecordListProps> = ({ records, onDelete, onEdit }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeFilter, setActiveFilter] = useState<FilterType>(null);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }
  
    const filteredRecords = useMemo(() => {
        let dateFilteredRecords = records.filter(r => isSameDay(new Date(r.timestamp), selectedDate));

        if (!activeFilter) {
          return dateFilteredRecords;
        }
        switch (activeFilter) {
          case 'NURSING':
            return dateFilteredRecords.filter(r => r.type === RecordType.NURSING);
          case 'BOTTLE':
            return dateFilteredRecords.filter(r => r.type === RecordType.BOTTLE_FORMULA || r.type === RecordType.BOTTLE_MILK);
          case 'PUMPING':
            return dateFilteredRecords.filter(r => r.type === RecordType.PUMPING);
          default:
            return dateFilteredRecords;
        }
    }, [records, activeFilter, selectedDate]);


    const sorted = [...filteredRecords].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <span className="text-6xl mb-4">👶</span>
                <p className="text-lg font-medium text-zinc-400">No records yet.</p>
                <p className="text-sm text-zinc-400 mt-2">Tap + or say "Hi Auntie"</p>
            </div>
        )
    }

    const dailyRecords = records.filter(r => isSameDay(new Date(r.timestamp), selectedDate));

    const nursingTotal = dailyRecords.filter(r => r.type === RecordType.NURSING)
    .reduce((acc, curr) => {
        if (curr.endTime) {
            return acc + (new Date(curr.endTime).getTime() - new Date(curr.timestamp).getTime());
        }
        return acc;
    }, 0) / (1000 * 60);

    const bottleTotal = dailyRecords.filter(r => r.type === RecordType.BOTTLE_FORMULA || r.type === RecordType.BOTTLE_MILK)
    .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);

    const pumpingTotal = dailyRecords.filter(r => r.type === RecordType.PUMPING)
    .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);

  
    return (
        <>
        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <div className="grid grid-cols-3 gap-2 mb-4">
            <FilterButton 
                label="Nursing" 
                value={`${nursingTotal.toFixed(0)} min`} 
                isActive={activeFilter === 'NURSING'} 
                onClick={() => setActiveFilter(activeFilter === 'NURSING' ? null : 'NURSING')} 
                color="pink"
            />
            <FilterButton 
                label="Bottle" 
                value={`${bottleTotal} ml`} 
                isActive={activeFilter === 'BOTTLE'} 
                onClick={() => setActiveFilter(activeFilter === 'BOTTLE' ? null : 'BOTTLE')} 
                color="blue"
            />
            <FilterButton 
                label="Pumping" 
                value={`${pumpingTotal} ml`} 
                isActive={activeFilter === 'PUMPING'} 
                onClick={() => setActiveFilter(activeFilter === 'PUMPING' ? null : 'PUMPING')} 
                color="purple"
            />
        </div>

      <div className="space-y-6 pb-32">
        {sorted.map((item) => (
            <div 
                key={item.id} 
                className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex items-start gap-4 relative group overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => onEdit(item)}
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${getColor(item.type)}`}>
                {getIcon(item.type)}
                </div>
                
                <div className="flex-1 pr-10"> 
                <div className="flex justify-between items-start">
                    <div>
                    <h4 className="font-bold text-zinc-800 text-base">
                        {getLabel(item)}
                    </h4>
                    <div className="flex items-center text-xs text-zinc-500 font-medium mt-0.5">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: userTimeZone })}
                        {item.endTime && (
                            <>
                                <span className="mx-1">→</span>
                                {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: userTimeZone })}
                            </>
                        )}
                    </div>
                    </div>
                </div>
                
                {/* Display Raw Voice Input */}
                {item.rawInput && item.rawInput !== 'Manual Entry' && (
                    <div className="mt-1.5 text-sm text-zinc-500 italic border-l-2 border-zinc-100 pl-2">
                        "{item.rawInput}"
                    </div>
                )}

                <div className="mt-2 text-sm text-zinc-600 flex flex-wrap gap-2">
                    {item.amountMl && <span className="inline-block bg-zinc-100 rounded-md px-2 py-1 font-semibold text-zinc-700">{item.amountMl}ml</span>}
                    {item.side && <span className="inline-block bg-zinc-100 rounded-md px-2 py-1 capitalize">{item.side}</span>}
                    {item.note && <span className="text-zinc-400 text-xs italic">Note: {item.note}</span>}
                </div>
                </div>

                {/* Delete Button - Made explicit and larger */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    className="absolute top-0 right-0 h-full w-14 bg-transparent text-zinc-200 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center z-20"
                    aria-label="Delete"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.s673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 4.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>

            </div>
        ))}
        {filteredRecords.length === 0 && (
            <div className="text-center py-10">
                <p className="text-zinc-400">No records for this day.</p>
            </div>
        )}
      </div>
      </>
    );
  };
  
  const FilterButton = ({ label, value, isActive, onClick, color }: any) => {
    const colorClasses = {
        pink: 'border-pink-200 bg-pink-50 text-pink-700',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        purple: 'border-purple-200 bg-purple-50 text-purple-700'
    };
    const inactiveClasses = 'border-zinc-200 bg-white text-zinc-500';
  
    return (
        <button 
            onClick={onClick}
            className={`p-3 rounded-xl border-2 text-left transition-all ${isActive ? colorClasses[color] : inactiveClasses}`}
        >
            <p className="text-xs font-bold uppercase">{label}</p>
            <p className="text-lg font-black">{value}</p>
        </button>
    )
  }

  export default RecordList;
