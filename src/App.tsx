import React, { useState, useEffect, useRef } from 'react';
import { FeedingRecord, ViewState } from './types';
import VoiceAssistant from './components/VoiceAssistant';
import RecordList from './components/RecordList';
import StatsView from './components/StatsView';
import ManualEntry from './components/ManualEntry';

const App = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Lazy initialization with robust check
  const [records, setRecords] = useState<FeedingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('feeding_records');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load records", e);
      return [];
    }
  });

  // Save to local storage whenever records change
  useEffect(() => {
    try {
        localStorage.setItem('feeding_records', JSON.stringify(records));
    } catch (e) {
        console.error("Failed to save records", e);
    }
  }, [records]);

  // Handle URL Params for Shortcuts
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'voice') {
          setIsVoiceOpen(true);
          window.history.replaceState({}, document.title, "/");
      }
  }, []);

  const addRecord = (record: FeedingRecord) => {
    setRecords(prev => [record, ...prev]);
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

  const handleExport = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aiauntie_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (Array.isArray(importedData)) {
            if (window.confirm(`Found ${importedData.length} records. This will merge with your current data. Continue?`)) {
                // Merge logic: avoid duplicates by ID
                setRecords(prev => {
                    const currentIds = new Set(prev.map(r => r.id));
                    const newRecords = importedData.filter((r: FeedingRecord) => !currentIds.has(r.id));
                    return [...newRecords, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                });
                alert("Import successful!");
            }
        } else {
            alert("Invalid file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse file. Please ensure it is a valid JSON export.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-gray-50 relative shadow-2xl overflow-hidden pb-32">
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        className="hidden" 
      />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur-md px-6 py-4 flex justify-between items-center safe-top border-b border-gray-200/50">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            AiAuntie
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Smart Baby Tracker</p>
        </div>
        
        {/* Top Right: Manual Entry Plus Button */}
        <button 
            onClick={() => {
                setEditingRecord(null);
                setIsManualOpen(true);
            }}
            className="bg-zinc-900 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            aria-label="Add Record"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="px-6 py-6 min-h-[calc(100vh-160px)]">
        {view === 'HOME' && (
          <>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-3xl font-bold text-zinc-800 tracking-tight">Today</h2>
              <span className="text-zinc-400 text-sm font-medium">{new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'})}</span>
            </div>
            <RecordList records={records} onDelete={deleteRecord} onEdit={handleEdit} />
          </>
        )}

        {view === 'STATS' && (
           <>
            <h2 className="text-3xl font-bold text-zinc-800 tracking-tight mb-6">Insights</h2>
            <StatsView records={records} />
           </>
        )}

        {view === 'SETTINGS' && (
            <div className="space-y-6">
                 <h2 className="text-3xl font-bold text-zinc-800 tracking-tight mb-6">Settings</h2>
                 
                 {/* iOS Shortcut Guide */}
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white">
                     <h3 className="font-bold text-xl mb-2">⚡️ Set up "Hi Auntie"</h3>
                     <p className="text-indigo-100 text-sm mb-4">
                        Enable voice recording from iOS Home Screen or Siri.
                     </p>
                     
                     <div className="bg-white/10 rounded-xl p-4 space-y-3 backdrop-blur-sm">
                        <div className="flex gap-3 items-start">
                            <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                            <p className="text-sm">Open <strong>Shortcuts</strong> app on iPhone.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                            <p className="text-sm">Tap <strong>+</strong> to create a new shortcut.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                            <p className="text-sm">Add Action: <strong>Open URL</strong>.</p>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                            <div className="w-full">
                                <p className="text-sm mb-1">Paste this URL:</p>
                                <div className="bg-black/30 p-2 rounded text-xs font-mono break-all select-all">
                                    {window.location.origin}/?action=voice
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">5</span>
                            <p className="text-sm">Name it <strong>Hi Auntie</strong>.</p>
                        </div>
                     </div>
                     <p className="mt-4 text-xs text-indigo-200 text-center font-medium">Now say "Hey Siri, Hi Auntie"!</p>
                 </div>

                 <div className="bg-white rounded-2xl p-6 shadow-sm">
                     <h3 className="font-bold text-lg mb-4">Data Management</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleExport}
                            className="w-full py-4 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold active:scale-95 transition-transform flex flex-col items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-zinc-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Export
                        </button>
                        <button 
                            onClick={triggerImport}
                            className="w-full py-4 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold active:scale-95 transition-transform flex flex-col items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-zinc-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            Import
                        </button>
                     </div>
                     <p className="text-xs text-center text-zinc-400 mt-3">Supports .json format</p>
                 </div>
            </div>
        )}
      </main>

      {/* Floating Action Button (Voice) - Lifted HIGHER (bottom-24) to float above Nav */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-20">
         <button 
            onClick={() => setIsVoiceOpen(true)}
            className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-full shadow-xl shadow-rose-500/40 flex items-center justify-center text-white active:scale-90 transition-transform ring-4 ring-gray-50"
         >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
             </svg>
         </button>
      </div>

      {/* Bottom Navigation - 3 Columns Equal Width */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-zinc-200 safe-bottom pb-2 pt-2 z-10">
        <div className="grid grid-cols-3 h-14">
            {/* 1. Timeline */}
            <button 
                onClick={() => setView('HOME')}
                className={`flex flex-col items-center justify-center transition-colors ${view === 'HOME' ? 'text-rose-500' : 'text-zinc-400'}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill={view === 'HOME' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold">Timeline</span>
            </button>

            {/* 2. Stats */}
            <button 
                onClick={() => setView('STATS')}
                className={`flex flex-col items-center justify-center transition-colors ${view === 'STATS' ? 'text-rose-500' : 'text-zinc-400'}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill={view === 'STATS' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[10px] font-bold">Stats</span>
            </button>
            
            {/* 3. Settings */}
            <button 
                onClick={() => setView('SETTINGS')}
                className={`flex flex-col items-center justify-center transition-colors ${view === 'SETTINGS' ? 'text-rose-500' : 'text-zinc-400'}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill={view === 'SETTINGS' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 0a8.982 8.982 0 016.297 3.5m0 0A18.028 18.028 0 0121 12c0 1.592-.198 3.13-.593 4.607M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-[10px] font-bold">Settings</span>
            </button>
        </div>
      </nav>

      {/* Modals */}
      <VoiceAssistant 
        isOpen={isVoiceOpen} 
        onClose={() => setIsVoiceOpen(false)} 
        onRecordAdded={addRecord} 
      />
      <ManualEntry
        isOpen={isManualOpen}
        onClose={() => {
            setIsManualOpen(false);
            setEditingRecord(null);
        }}
        onSave={editingRecord ? updateRecord : addRecord}
        recordToEdit={editingRecord}
      />
    </div>
  );
};

export default App;
