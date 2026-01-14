import React, { useMemo } from 'react';
import { FeedingRecord, RecordType } from '../types';

interface RecordListProps {
  records: FeedingRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: FeedingRecord) => void;
}

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
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const grouped = useMemo(() => {
        const g: Record<string, FeedingRecord[]> = {};
        records.forEach(rec => {
            const dateKey = new Date(rec.timestamp).toDateString();
            if(!g[dateKey]) g[dateKey] = [];
            g[dateKey].push(rec);
        });
        return g;
    }, [records]);

    if (records.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <span className="text-6xl mb-4">👶</span>
                <p className="text-lg font-medium text-zinc-400">No records found.</p>
            </div>
        )
    }

    return (
      <div className="space-y-6 pb-32 pt-4">
        {Object.entries(grouped).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([dateKey, items]) => (
            <div key={dateKey} data-datekey={dateKey} className="scroll-mt-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1 sticky top-0 bg-gray-50/95 py-2 z-10 backdrop-blur-sm">
                    {new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <div className="space-y-3">
                {items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((item) => (
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
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                            }}
                            className="absolute top-0 right-0 h-full w-14 bg-transparent text-zinc-200 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center z-10"
                            aria-label="Delete"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                ))}
                </div>
            </div>
        ))}
      </div>
    );
  };

  export default RecordList;
