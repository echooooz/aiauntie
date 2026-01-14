import { FeedingRecord, RecordType, DiaperType } from './types';

export const generateDemoData = (): FeedingRecord[] => {
  const records: FeedingRecord[] = [];
  const now = new Date();
  
  // Helper to add minutes
  const addMinutes = (date: Date, min: number) => new Date(date.getTime() + min * 60000);

  // Today's records (Generates about 15 records to ensure scrolling)
  let time = new Date(now);
  time.setHours(7, 0, 0, 0); // Start at 7 AM

  const createRecord = (type: RecordType, offsetMin: number, durationMin?: number, amount?: number, side?: any, diaper?: any): FeedingRecord => {
    const start = addMinutes(time, offsetMin);
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

  // 07:00 Wake up & Diaper
  records.push(createRecord(RecordType.DIAPER, 0, undefined, undefined, undefined, DiaperType.WET));
  
  // 07:15 Nursing
  records.push(createRecord(RecordType.NURSING, 15, 20, undefined, 'left'));

  // 09:00 Nap
  records.push(createRecord(RecordType.SLEEP, 120, 45));

  // 10:00 Bottle
  records.push(createRecord(RecordType.BOTTLE_FORMULA, 180, undefined, 120));

  // 12:00 Diaper
  records.push(createRecord(RecordType.DIAPER, 300, undefined, undefined, undefined, DiaperType.DIRTY));

  // 12:30 Nursing
  records.push(createRecord(RecordType.NURSING, 330, 15, undefined, 'right'));

  // 14:00 Pump
  records.push(createRecord(RecordType.PUMPING, 420, 20, 150));

  // 15:00 Bottle Milk
  records.push(createRecord(RecordType.BOTTLE_MILK, 480, undefined, 100));

  // 16:00 Nap
  records.push(createRecord(RecordType.SLEEP, 540, 60));
  
  // 18:00 Diaper
  records.push(createRecord(RecordType.DIAPER, 660, undefined, undefined, undefined, DiaperType.MIXED));

  // 18:30 Nursing
  records.push(createRecord(RecordType.NURSING, 690, 25, undefined, 'both'));

  // 20:00 Sleep
  records.push(createRecord(RecordType.SLEEP, 780, 0)); // Ongoing sleep? Or just start time.

  // Yesterday (a few records)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(8, 0, 0, 0);
  
  records.push({
      id: crypto.randomUUID(),
      type: RecordType.BOTTLE_FORMULA,
      timestamp: yesterday.toISOString(),
      amountMl: 140,
      rawInput: 'Yesterday demo'
  });
  
   records.push({
      id: crypto.randomUUID(),
      type: RecordType.DIAPER,
      timestamp: addMinutes(yesterday, 60).toISOString(),
      diaperType: DiaperType.WET,
      rawInput: 'Yesterday demo'
  });

  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
