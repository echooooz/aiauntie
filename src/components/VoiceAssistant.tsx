import React, { useState, useEffect, useRef } from 'react';
import { parseVoiceCommand } from '../services/geminiService';
import { FeedingRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface VoiceAssistantProps {
  onRecordAdded: (record: FeedingRecord) => void;
  isOpen: boolean;
  onClose: () => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onRecordAdded, isOpen, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const statusRef = useRef(status);

  // Sync ref with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Stop after one sentence
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN'; 

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatus('LISTENING');
        transcriptRef.current = '';
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        // We capture the text but DO NOT display it to the user anymore
        if (finalTranscript) {
             transcriptRef.current = finalTranscript;
             recognitionRef.current.stop(); 
             processCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event.error);
        if (event.error === 'no-speech') {
            // Silence is acceptable, keep waiting or let user restart
        } else {
            setIsListening(false);
            setStatus('ERROR');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (statusRef.current === 'LISTENING' && !transcriptRef.current) {
            setStatus('IDLE');
        }
      };
    } else {
      setStatus('ERROR');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start when opened
  useEffect(() => {
    if (isOpen && recognitionRef.current && status === 'IDLE') {
        try {
            recognitionRef.current.start();
        } catch(e) {
            console.log("Already started", e);
        }
    } else if (!isOpen) {
        if(isListening) recognitionRef.current?.stop();
        setTimeout(() => {
            setStatus('IDLE');
        }, 300);
    }
  }, [isOpen]); 


  const processCommand = async (text: string) => {
    if (statusRef.current === 'PROCESSING' || statusRef.current === 'SUCCESS') return;

    setStatus('PROCESSING');
    try {
      const result = await parseVoiceCommand(text);
      
      const newRecord: FeedingRecord = {
        id: uuidv4(),
        ...result,
        rawInput: text
      };

      onRecordAdded(newRecord);
      setStatus('SUCCESS');
      
      // Auto close after success
      setTimeout(() => {
        onClose();
        setStatus('IDLE');
      }, 1500);

    } catch (error) {
      console.error(error);
      setStatus('ERROR');
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full sm:w-96 bg-white rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl transform transition-transform duration-300 animate-in slide-in-from-bottom-10 pb-12">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-zinc-800">
            {status === 'LISTENING' && 'Listening...'}
            {status === 'PROCESSING' && 'Thinking...'}
            {status === 'SUCCESS' && 'Saved!'}
            {status === 'ERROR' && 'Error'}
            {status === 'IDLE' && 'Hi Auntie'}
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:bg-zinc-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="flex flex-col items-center justify-center min-h-[160px] text-center">
            
            {status === 'LISTENING' && (
                <div 
                    onClick={handleMicClick}
                    className="flex space-x-2 h-20 items-center justify-center cursor-pointer"
                >
                    <div className="voice-wave bg-rose-500 w-2"></div>
                    <div className="voice-wave bg-rose-500 w-2"></div>
                    <div className="voice-wave bg-rose-500 w-2"></div>
                    <div className="voice-wave bg-rose-500 w-2"></div>
                    <div className="voice-wave bg-rose-500 w-2"></div>
                </div>
            )}

            {status === 'PROCESSING' && (
                 <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}

            {status === 'SUCCESS' && (
                 <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-10 h-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                 </div>
            )}

            {status === 'ERROR' && (
                <div className="flex flex-col items-center">
                     <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                     </div>
                     <p className="text-zinc-500">I didn't catch that.</p>
                     <button onClick={handleMicClick} className="mt-4 text-rose-500 font-bold">Try Again</button>
                </div>
            )}

            {status === 'IDLE' && (
                 <button 
                 onClick={handleMicClick}
                 className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-rose-500/30 active:scale-95 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-10 h-10">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                 </button>
            )}

        </div>
        
        {/* Helper Text */}
        <div className="mt-8 text-center">
            {status === 'IDLE' && <p className="text-zinc-400 text-sm">Tap microphone to speak</p>}
            {status === 'LISTENING' && <p className="text-zinc-400 text-sm">Listening...</p>}
        </div>

      </div>
    </div>
  );
};

export default VoiceAssistant;