import { FeedingRecord, RecordType, DiaperType } from './types';

export interface MockDataOptions {
  days?: number;
  profile?: 'light' | 'standard' | 'heavy';
  seed?: number;
}

const DEFAULT_OPTIONS: Required<MockDataOptions> = {
  days: 10,
  profile: 'standard',
  seed: 42,
};

const PROFILE_EVENT_COUNT = {
  light: 8,
  standard: 12,
  heavy: 18,
} as const;

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const addMinutes = (date: Date, min: number) => new Date(date.getTime() + min * 60000);

const createRecord = (
  id: string,
  baseTime: Date,
  type: RecordType,
  offsetMin: number,
  durationMin?: number,
  amount?: number,
  side?: FeedingRecord['side'],
  diaper?: DiaperType,
  note?: string
): FeedingRecord => {
  const start = addMinutes(baseTime, offsetMin);
  return {
    id,
    type,
    timestamp: start.toISOString(),
    endTime: durationMin ? addMinutes(start, durationMin).toISOString() : undefined,
    amountMl: amount,
    side,
    diaperType: diaper,
    rawInput: 'Mock Data',
    note,
  };
};

const pushCoreDayPattern = (
  records: FeedingRecord[],
  date: Date,
  random: () => number,
  dayIndex: number
) => {
  const makeId = (suffix: string) => `${date.toISOString()}-${suffix}-${dayIndex}`;

  records.push(createRecord(makeId('diaper-wet-am'), date, RecordType.DIAPER, 0, undefined, undefined, undefined, DiaperType.WET, 'Mock day pattern'));
  records.push(createRecord(makeId('nursing-left'), date, RecordType.NURSING, 15, 12 + Math.floor(random() * 16), undefined, 'left', undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('sleep-am'), date, RecordType.SLEEP, 110, 35 + Math.floor(random() * 30), undefined, undefined, undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('formula'), date, RecordType.BOTTLE_FORMULA, 175, undefined, 80 + Math.floor(random() * 70), undefined, undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('diaper-dirty-noon'), date, RecordType.DIAPER, 285, undefined, undefined, undefined, DiaperType.DIRTY, 'Mock day pattern'));
  records.push(createRecord(makeId('nursing-right'), date, RecordType.NURSING, 330, 10 + Math.floor(random() * 12), undefined, 'right', undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('pump'), date, RecordType.PUMPING, 430, 15 + Math.floor(random() * 15), 90 + Math.floor(random() * 90), 'both', undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('bottle-milk'), date, RecordType.BOTTLE_MILK, 500, undefined, 70 + Math.floor(random() * 60), undefined, undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('sleep-pm'), date, RecordType.SLEEP, 560, 45 + Math.floor(random() * 35), undefined, undefined, undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('diaper-mixed-evening'), date, RecordType.DIAPER, 660, undefined, undefined, undefined, DiaperType.MIXED, 'Mock day pattern'));
  records.push(createRecord(makeId('nursing-both'), date, RecordType.NURSING, 700, 18 + Math.floor(random() * 18), undefined, 'both', undefined, 'Mock day pattern'));
  records.push(createRecord(makeId('sleep-night'), date, RecordType.SLEEP, 820, 90 + Math.floor(random() * 90), undefined, undefined, undefined, 'Mock day pattern'));
};

const pushExtraEvents = (
  records: FeedingRecord[],
  date: Date,
  random: () => number,
  dayIndex: number,
  extraCount: number
) => {
  for (let i = 0; i < extraCount; i += 1) {
    const slot = 60 + Math.floor(random() * 1200);
    const variant = i % 4;

    if (variant === 0) {
      records.push(
        createRecord(
          `${date.toISOString()}-extra-pump-${dayIndex}-${i}`,
          date,
          RecordType.PUMPING,
          slot,
          10 + Math.floor(random() * 15),
          40 + Math.floor(random() * 80),
          random() > 0.5 ? 'left' : 'right',
          undefined,
          'Mock extra event'
        )
      );
      continue;
    }

    if (variant === 1) {
      records.push(
        createRecord(
          `${date.toISOString()}-extra-diaper-${dayIndex}-${i}`,
          date,
          RecordType.DIAPER,
          slot,
          undefined,
          undefined,
          undefined,
          [DiaperType.WET, DiaperType.DIRTY, DiaperType.MIXED][Math.floor(random() * 3)],
          'Mock extra event'
        )
      );
      continue;
    }

    if (variant === 2) {
      records.push(
        createRecord(
          `${date.toISOString()}-extra-bottle-${dayIndex}-${i}`,
          date,
          random() > 0.55 ? RecordType.BOTTLE_FORMULA : RecordType.BOTTLE_MILK,
          slot,
          undefined,
          50 + Math.floor(random() * 90),
          undefined,
          undefined,
          'Mock extra event'
        )
      );
      continue;
    }

    records.push(
      createRecord(
        `${date.toISOString()}-extra-sleep-${dayIndex}-${i}`,
        date,
        RecordType.SLEEP,
        slot,
        20 + Math.floor(random() * 50),
        undefined,
        undefined,
        undefined,
        'Mock extra event'
      )
    );
  }
};

export const generateMockData = (options: MockDataOptions = {}): FeedingRecord[] => {
  const { days, profile, seed } = { ...DEFAULT_OPTIONS, ...options };
  const records: FeedingRecord[] = [];
  const random = mulberry32(seed);
  const now = new Date();
  const baseEventCount = PROFILE_EVENT_COUNT[profile];
  const extraEventCount = Math.max(0, baseEventCount - 12);

  for (let i = 0; i < days; i += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(6 + Math.floor(random() * 2), 0, 0, 0);

    pushCoreDayPattern(records, date, random, i);
    pushExtraEvents(records, date, random, i, extraEventCount);
  }

  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const generateDemoData = (): FeedingRecord[] => generateMockData({ days: 10, profile: 'standard' });

