export enum RecordType {
  NURSING = 'NURSING', // 亲喂
  BOTTLE_MILK = 'BOTTLE_MILK', // 母乳瓶喂
  BOTTLE_FORMULA = 'BOTTLE_FORMULA', // 奶粉瓶喂
  PUMPING = 'PUMPING', // 吸奶
  DIAPER = 'DIAPER', // 换尿布
  SLEEP = 'SLEEP', // 睡觉
  OTHER = 'OTHER'
}

export enum DiaperType {
  WET = 'WET',
  DIRTY = 'DIRTY',
  MIXED = 'MIXED'
}

export interface FeedingRecord {
  id: string;
  type: RecordType;
  timestamp: string; // ISO String
  endTime?: string; // For nursing/pumping/sleep duration
  amountMl?: number; // For bottle/pumping
  side?: 'left' | 'right' | 'both'; // For nursing/pumping
  diaperType?: DiaperType;
  note?: string;
  rawInput?: string; // The original voice command
}

export type ViewState = 'HOME' | 'STATS' | 'SETTINGS';

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}