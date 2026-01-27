import { FeedingRecord, RecordType, DiaperType } from './types';

export const generateDemoData = (): FeedingRecord[] => {
  const records: FeedingRecord[] = [];
  const now = new Date();
  
  // Helper to add minutes
  const addMinutes = (date: Date, min: number) => new Date(date.getTime() + min * 60000);

  const createRecord = (baseTime: Date, type: RecordType, offsetMin: number, durationMin?: number, amount?: number, side?: any, diaper?: any): FeedingRecord => {
    const start = addMinutes(baseTime, offsetMin);
    return {
      id: crypto.randomUUID(),
      type,
      timestamp: start.toISOString(),
      endTime: durationMin ? addMinutes(start, durationMin).toISOString() : undefined,
      amountMl: amount,
      side,
      diaperType: diaper,
      rawInput: 'Demo Data',
      note: 'Generated for testing'
    };
  };

  // Generate 10 days of data
  for (let i = 0; i < 10; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(7, 0, 0, 0); // Start at 7 AM

    // Skip future if we are on "today" but it's early? No, just generate standard pattern.
    
    // 07:00 Wake up & Diaper
    records.push(createRecord(date, RecordType.DIAPER, 0, undefined, undefined, undefined, DiaperType.WET));
    
    // 07:15 Nursing (randomize duration slightly)
    records.push(createRecord(date, RecordType.NURSING, 15, 15 + Math.floor(Math.random() * 15), undefined, 'left'));

    // 09:00 Nap
    records.push(createRecord(date, RecordType.SLEEP, 120, 45));

    // 10:00 Bottle (randomize amount)
    records.push(createRecord(date, RecordType.BOTTLE_FORMULA, 180, undefined, 100 + Math.floor(Math.random() * 40)));

    // 12:00 Diaper
    records.push(createRecord(date, RecordType.DIAPER, 300, undefined, undefined, undefined, DiaperType.DIRTY));

    // 12:30 Nursing
    records.push(createRecord(date, RecordType.NURSING, 330, 15, undefined, 'right'));

    // 14:00 Pump
    records.push(createRecord(date, RecordType.PUMPING, 420, 20, 120 + Math.floor(Math.random() * 60)));

    // 15:00 Bottle Milk
    records.push(createRecord(date, RecordType.BOTTLE_MILK, 480, undefined, 90 + Math.floor(Math.random() * 30)));

    // 16:00 Nap
    records.push(createRecord(date, RecordType.SLEEP, 540, 60));
    
    // 18:00 Diaper
    records.push(createRecord(date, RecordType.DIAPER, 660, undefined, undefined, undefined, DiaperType.MIXED));

    // 18:30 Nursing
    records.push(createRecord(date, RecordType.NURSING, 690, 25, undefined, 'both'));

    // 20:00 Sleep
    records.push(createRecord(date, RecordType.SLEEP, 780, 0));
  }

  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
