import React, { useState, useEffect } from 'react';
import { FeedingRecord, RecordType, DiaperType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ManualEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: FeedingRecord) => void;
  recordToEdit?: FeedingRecord | null;
}

const getLocalISOString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
}

const ManualEntry: React.FC<ManualEntryProps> = ({ isOpen, onClose, onSave, recordToEdit }) => {
  const [step, setStep] = useState<'TYPE_SELECT' | 'DETAILS'>('TYPE_SELECT');
  const [selectedType, setSelectedType] = useState<RecordType | null>(null);
  
  // Form State
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState(''); 
  const [amount, setAmount] = useState<string>('');
  const [side, setSide] = useState<'left' | 'right' | 'both'>('both');
  const [diaper, setDiaper] = useState<DiaperType>(DiaperType.WET);

  useEffect(() => {
    if (isOpen) {
      if (recordToEdit) {
        // Editing existing record
        setStep('DETAILS');
        setSelectedType(recordToEdit.type);
        setStartTime(getLocalISOString(new Date(recordToEdit.timestamp)));
        setEndTime(recordToEdit.endTime ? getLocalISOString(new Date(recordToEdit.endTime)) : '');
        setAmount(recordToEdit.amountMl ? String(recordToEdit.amountMl) : '');
        setSide(recordToEdit.side || 'both');
        setDiaper(recordToEdit.diaperType || DiaperType.WET);
      } else {
        // Creating new record
        setStep('TYPE_SELECT');
        setSelectedType(null);
        setStartTime(getLocalISOString(new Date()));
        setEndTime('');
        setAmount('');
        setSide('both');
        setDiaper(DiaperType.WET);
      }
    }
  }, [isOpen, recordToEdit]);


  if (!isOpen) return null;

  const handleTypeSelect = (type: RecordType) => {
    setSelectedType(type);
    setStartTime(getLocalISOString(new Date()));
    setEndTime('');
    setAmount('');
    setStep('DETAILS');
  };

  const handleSave = () => {
    if (!selectedType) return;

    const record: FeedingRecord = {
      id: recordToEdit?.id || uuidv4(),
      type: selectedType,
      timestamp: new Date(startTime).toISOString(),
      rawInput: recordToEdit?.rawInput || 'Manual Entry'
    };

    if (endTime) record.endTime = new Date(endTime).toISOString();
    if (amount) record.amountMl = parseInt(amount);
    if (selectedType === RecordType.NURSING || selectedType === RecordType.PUMPING) record.side = side;
    if (selectedType === RecordType.DIAPER) record.diaperType = diaper;

    onSave(record);
    handleClose();
  };

  const handleClose = () => {
    setStep('TYPE_SELECT');
    setSelectedType(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:w-96 bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl h-[80vh] sm:h-auto overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <button onClick={handleClose} className="text-zinc-500 font-medium">Cancel</button>
          <h3 className="font-bold text-lg">{step === 'TYPE_SELECT' ? 'New Entry' : (recordToEdit ? 'Edit Entry' : 'Details')}</h3>
          {step === 'DETAILS' ? (
              <button onClick={handleSave} className="text-rose-600 font-bold">Save</button>
          ) : (
              <div className="w-12"></div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          
          {step === 'TYPE_SELECT' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Nursing First, Pumping Second */}
              <TypeButton icon="🤱" label="Nursing" color="bg-pink-100 text-pink-700" onClick={() => handleTypeSelect(RecordType.NURSING)} />
              <TypeButton icon="🧴" label="Pumping" color="bg-purple-100 text-purple-700" onClick={() => handleTypeSelect(RecordType.PUMPING)} />
              
              <TypeButton icon="🍼" label="Formula" color="bg-blue-100 text-blue-700" onClick={() => handleTypeSelect(RecordType.BOTTLE_FORMULA)} />
              <TypeButton icon="💧" label="Breast Milk" color="bg-sky-100 text-sky-600" onClick={() => handleTypeSelect(RecordType.BOTTLE_MILK)} />
              
              <TypeButton icon="🧷" label="Diaper" color="bg-yellow-100 text-yellow-700" onClick={() => handleTypeSelect(RecordType.DIAPER)} />
              <TypeButton icon="💤" label="Sleep" color="bg-indigo-100 text-indigo-700" onClick={() => handleTypeSelect(RecordType.SLEEP)} />
            </div>
          )}

          {step === 'DETAILS' && (
            <div className="space-y-6">
               <div className="flex items-center justify-center mb-6">
                   <span className={`text-4xl p-4 rounded-full ${getTypeColor(selectedType)}`}>{getTypeIcon(selectedType)}</span>
                   <span className="ml-3 text-xl font-bold text-zinc-800">{getTypeLabel(selectedType)}</span>
               </div>

               {/* Time Inputs */}
               <div className="space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Start Time</label>
                       <input 
                        type="datetime-local" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-800 text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                       />
                   </div>
                   
                   {(selectedType === RecordType.NURSING || selectedType === RecordType.SLEEP || selectedType === RecordType.PUMPING) && (
                       <div>
                           <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">End Time (Optional)</label>
                           <input 
                            type="datetime-local" 
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-800 text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                           />
                       </div>
                   )}
               </div>

               {/* Amount Input */}
               {(selectedType === RecordType.BOTTLE_FORMULA || selectedType === RecordType.BOTTLE_MILK || selectedType === RecordType.PUMPING) && (
                   <div>
                       <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Amount (ml)</label>
                       <div className="flex items-center gap-4">
                           <input 
                            type="number" 
                            placeholder="120"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-800 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-rose-500"
                           />
                           <div className="flex gap-2">
                               <button onClick={() => setAmount((p) => String((parseInt(p)||0) + 10))} className="bg-zinc-100 p-3 rounded-lg font-bold">+</button>
                               <button onClick={() => setAmount((p) => String(Math.max(0, (parseInt(p)||0) - 10)))} className="bg-zinc-100 p-3 rounded-lg font-bold">-</button>
                           </div>
                       </div>
                   </div>
               )}

               {/* Side Selection */}
               {(selectedType === RecordType.NURSING || selectedType === RecordType.PUMPING) && (
                   <div>
                       <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Side</label>
                       <div className="flex bg-zinc-100 p-1 rounded-xl">
                           {(['left', 'both', 'right'] as const).map(s => (
                               <button
                                key={s}
                                onClick={() => setSide(s)}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${side === s ? 'bg-white shadow text-zinc-900' : 'text-zinc-400'}`}
                               >
                                   {s}
                               </button>
                           ))}
                       </div>
                   </div>
               )}

               {/* Diaper Type */}
               {selectedType === RecordType.DIAPER && (
                   <div>
                       <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Condition</label>
                       <div className="grid grid-cols-3 gap-2">
                           {[DiaperType.WET, DiaperType.DIRTY, DiaperType.MIXED].map(d => (
                               <button
                                key={d}
                                onClick={() => setDiaper(d)}
                                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${diaper === d ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-zinc-100 bg-zinc-50 text-zinc-400'}`}
                               >
                                   {d}
                               </button>
                           ))}
                       </div>
                   </div>
               )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TypeButton = ({ icon, label, color, onClick }: any) => (
    <button onClick={onClick} className={`${color} p-4 rounded-2xl flex flex-col items-center justify-center gap-2 aspect-square active:scale-95 transition-transform`}>
        <span className="text-4xl">{icon}</span>
        <span className="font-bold text-sm">{label}</span>
    </button>
);

const getTypeColor = (type: RecordType | null) => {
    switch (type) {
      case RecordType.BOTTLE_FORMULA: return 'bg-blue-100 text-blue-700';
      case RecordType.BOTTLE_MILK: return 'bg-sky-100 text-sky-600';
      case RecordType.NURSING: return 'bg-pink-100 text-pink-700';
      case RecordType.PUMPING: return 'bg-purple-100 text-purple-700';
      case RecordType.DIAPER: return 'bg-yellow-100 text-yellow-700';
      case RecordType.SLEEP: return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
};

const getTypeIcon = (type: RecordType | null) => {
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

const getTypeLabel = (type: RecordType | null) => {
    switch(type) {
        case RecordType.BOTTLE_FORMULA: return 'Formula';
        case RecordType.BOTTLE_MILK: return 'Breast Milk';
        case RecordType.NURSING: return 'Nursing';
        case RecordType.PUMPING: return 'Pumping';
        case RecordType.DIAPER: return 'Diaper Change';
        case RecordType.SLEEP: return 'Sleep';
        default: return 'Other';
    }
};

export default ManualEntry;
