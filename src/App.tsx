import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeedingRecord, ViewState, RecordType } from './types';
import { generateDemoData } from './demoData';
import VoiceAssistant from './components/VoiceAssistant';
import RecordList from './components/RecordList';
import StatsView from './components/StatsView';
import ManualEntry from './components/ManualEntry';
import DateSelector from './components/DateSelector';

// Define FilterType here as it's used in App's state
export type FilterType = 'NURSING' | 'BOTTLE' | 'PUMPING' | null;

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

const App = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scrolledDate, setScrolledDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  
  const [records, setRecords] = useState<FeedingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('feeding_records');
      if (!saved) return generateDemoData();
      
      const parsed = JSON.parse(saved);
      // If parsed data is empty array, load demo data for testing convenience
      if (Array.isArray(parsed) && parsed.length === 0) {
          return generateDemoData();
      }
      return parsed;
    } catch (e) {
      console.error("Failed to load records", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('feeding_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'voice') {
        setIsVoiceOpen(true);
        window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const handleExport = () => {
    const jsonData = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.download = `aiauntie_export_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File is not readable text.");
        const importedRecords: FeedingRecord[] = JSON.parse(text);
        
        // Basic validation
        if (!Array.isArray(importedRecords)) {
            throw new Error("Invalid format: Not an array.");
        }
        if (importedRecords.length > 0 && !('id' in importedRecords[0] && 'timestamp' in importedRecords[0])) {
             throw new Error("Invalid format: Records missing required fields.");
        }
        
        if (window.confirm("Importing will overwrite all existing data. Continue?")) {
            setRecords(importedRecords);
            alert("Data imported successfully!");
        }
      } catch (error) {
        console.error("Failed to import data:", error);
        alert(`Error importing data: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };
    reader.readAsText(file);
    // Reset file input to allow importing the same file again
    event.target.value = '';
  };

    const handleClearData = () => {
        if (window.confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
            if (window.confirm("Second confirmation: This will permanently erase everything. Proceed?")) {
                setRecords([]);
                alert("All data has been cleared.");
            }
        }
    };

  const addRecord = (record: FeedingRecord) => {
    setRecords(prev => [record, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const updateRecord = (updatedRecord: FeedingRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    setEditingRecord(null);
  };

  const deleteRecord = (id: string) => {
    if (window.confirm("Delete this record?")) {
        setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEdit = (record: FeedingRecord) => {
    setEditingRecord(record);
    setIsManualOpen(true);
  };

  const handleDateChange = (date: Date) => {
      setSelectedDate(date);
      // Also update the scrolled date to jump immediately
      setScrolledDate(date);
      
      const dateKey = date.toDateString();
      const mainContent = mainContentRef.current;
      const el = mainContent?.querySelector(`[data-datekey='${dateKey}']`);

      if (el && mainContent && headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        const elementPosition = (el as HTMLElement).offsetTop;
        mainContent.scrollTo({
            top: elementPosition - headerHeight,
            behavior: 'smooth'
        });
      }

      // After a short delay, clear selectedDate so scrolling can take over again
      setTimeout(() => {
          setSelectedDate(null);
      }, 1000); // 1 second lock
  };

  const handleScroll = () => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const dayElements = Array.from(mainContent.querySelectorAll('[data-datekey]'));
    let activeDateKey = null;

    // Find the last date group that is still at least partially visible from the top
    for (const el of dayElements) {
        const rect = el.getBoundingClientRect();
        // The top of the main content area, which is where we measure from.
        const containerTop = mainContent.getBoundingClientRect().top;
        
        // If the bottom of the element is below the container's top, it's visible.
        if (rect.bottom > containerTop) {
            activeDateKey = el.getAttribute('data-datekey');
            // We found the first one from the top that's visible, so that's our date.
            break;
        }
    }

    // If we scrolled past everything, activeDateKey will be null.
    // In this case, we can maybe default to the last known date or the first date in the list.
    // For now, let's only update if we found a valid one.
    if (activeDateKey) {
        const newDate = new Date(activeDateKey);
        if (newDate.toDateString() !== scrolledDate.toDateString()) {
            setScrolledDate(newDate);
        }
    }
  };

  const filteredRecords = useMemo(() => {
    if (!activeFilter) return records;
    switch (activeFilter) {
        case 'NURSING':
            return records.filter(r => r.type === RecordType.NURSING);
        case 'BOTTLE':
            return records.filter(r => r.type === RecordType.BOTTLE_FORMULA || r.type === RecordType.BOTTLE_MILK);
        case 'PUMPING':
            return records.filter(r => r.type === RecordType.PUMPING);
        default:
            return records;
    }
  }, [records, activeFilter]);

  const dailyTotals = useMemo(() => {
    const dateToFilter = selectedDate || scrolledDate;
    const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
    const dailyRecords = records.filter(r => isSameDay(new Date(r.timestamp), dateToFilter));
    
    const nursingTotal = dailyRecords.filter(r => r.type === RecordType.NURSING)
        .reduce((acc, curr) => acc + (curr.endTime ? (new Date(curr.endTime).getTime() - new Date(curr.timestamp).getTime()) : 0), 0) / (1000 * 60);
    const bottleTotal = dailyRecords.filter(r => r.type === RecordType.BOTTLE_FORMULA || r.type === RecordType.BOTTLE_MILK)
        .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
    const pumpingTotal = dailyRecords.filter(r => r.type === RecordType.PUMPING)
        .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
return { nursingTotal, bottleTotal, pumpingTotal };
}, [records, selectedDate, scrolledDate]);



  return (
    <div className="fixed inset-0 max-w-md mx-auto bg-gray-50 shadow-2xl flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />

      <header ref={headerRef} className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md safe-top border-b border-gray-200/50">
        <div className="px-6 pt-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
                AiAuntie
              </h1>
              <p className="text-xs text-zinc-400 font-medium">Smart Baby Tracker</p>
            </div>
            <button 
                onClick={() => { setEditingRecord(null); setIsManualOpen(true); }}
                className="bg-zinc-900 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
                aria-label="Add Record"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
        </div>
        
        {view === 'HOME' && (
            <div className="px-6 pt-4 pb-2">
                 <DateSelector selectedDate={selectedDate || scrolledDate} onDateChange={handleDateChange} records={records} />
                 <div className="grid grid-cols-3 gap-2 mt-2">
                     <FilterButton
                         label="Nursing"
                         value={`${dailyTotals.nursingTotal.toFixed(0)} min`} 
                         isActive={activeFilter === 'NURSING'} 
                         onClick={() => setActiveFilter(activeFilter === 'NURSING' ? null : 'NURSING')} 
                         color="pink"
                     />
                     <FilterButton 
                         label="Bottle" 
                         value={`${dailyTotals.bottleTotal} ml`} 
                         isActive={activeFilter === 'BOTTLE'} 
                         onClick={() => setActiveFilter(activeFilter === 'BOTTLE' ? null : 'BOTTLE')} 
                         color="blue"
                     />
                     <FilterButton 
                         label="Pumping" 
                         value={`${dailyTotals.pumpingTotal} ml`} 
                         isActive={activeFilter === 'PUMPING'} 
                         onClick={() => setActiveFilter(activeFilter === 'PUMPING' ? null : 'PUMPING')} 
                         color="purple"
                     />
                 </div>
            </div>
        )}
      </header>

      <main ref={mainContentRef} onScroll={handleScroll} className="flex-grow overflow-y-auto px-6">
        {view === 'HOME' && (
            <RecordList
                records={filteredRecords}
                onDelete={deleteRecord} 
                onEdit={handleEdit} 
            />
        )}
        {view === 'STATS' && <StatsView records={records} />}
        {view === 'SETTINGS' && (
            <div className="py-6 space-y-4">
                <div className="p-4 rounded-xl bg-white border border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-800">Data Management</h2>
                    <p className="text-sm text-zinc-500 mt-1">Export your data or import it on another device.</p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                            onClick={handleExport}
                            className="p-3 bg-zinc-800 text-white rounded-lg font-semibold text-center hover:bg-zinc-700 transition-colors"
                        >
                            Export Data
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 bg-zinc-800 text-white rounded-lg font-semibold text-center hover:bg-zinc-700 transition-colors"
                        >
                            Import Data
                        </button>
                    </div>
                </div>
                 <div className="p-4 rounded-xl bg-white border border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-800">Debug Zone</h2>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                        <button
                            onClick={() => {
                                if (window.confirm("Overwrite current data with 10 days of demo data?")) {
                                    setRecords(generateDemoData());
                                    alert("Demo data loaded!");
                                }
                            }}
                            className="p-3 bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-center hover:bg-indigo-200 transition-colors"
                        >
                            Load Demo Data (10 Days)
                        </button>
                    </div>
                </div>

                 <div className="p-4 rounded-xl bg-white border border-zinc-200">
                    <h2 className="text-lg font-bold text-zinc-800">Danger Zone</h2>
                    <p className="text-sm text-zinc-500 mt-1">This action cannot be undone. Please export your data first.</p>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                        <button
                            onClick={handleClearData}
                            className="p-3 bg-red-100 text-red-700 rounded-lg font-semibold text-center hover:bg-red-200 transition-colors border-red-300 border-2"
                        >
                            Clear All Data
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>

      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30">
         <button 
            onClick={() => setIsVoiceOpen(true)}
            className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-full shadow-xl flex items-center justify-center text-white ring-4 ring-gray-50"
         >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
             </svg>
         </button>
      </div>

      <nav className="flex-shrink-0 safe-bottom pb-2 pt-2 z-20 border-t border-zinc-200 bg-white">
        <div className="grid grid-cols-3 h-14">
            <button
                onClick={() => setView('HOME')}
                className={`flex flex-col items-center justify-center transition-colors ${view === 'HOME' ? 'text-rose-500' : 'text-zinc-400'}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill={view === 'HOME' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold">Timeline</span>
            </button>
            <button 
                onClick={() => setView('STATS')}
                className={`flex flex-col items-center justify-center transition-colors ${view === 'STATS' ? 'text-rose-500' : 'text-zinc-400'}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill={view === 'STATS' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[10px] font-bold">Stats</span>
            </button>
            <button 
                onClick={() => setView('SETTINGS')}
                className={`flex flex-col items-center justify-center transition-colors ${view === 'SETTINGS' ? 'text-rose-500' : 'text-zinc-400'}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill={view === 'SETTINGS' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-[10px] font-bold">Settings</span>
            </button>
        </div>
      </nav>

      <VoiceAssistant isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} onRecordAdded={addRecord} />
      <ManualEntry
        isOpen={isManualOpen}
        onClose={() => { setIsManualOpen(false); setEditingRecord(null); }}
        onSave={editingRecord ? updateRecord : addRecord}
        recordToEdit={editingRecord}
      />
    </div>
  );
};

export default App;
