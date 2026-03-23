import { FeedingRecord, RecordType } from '../types';

export type TimelineFilter = 'NURSING' | 'BOTTLE' | 'PUMPING' | null;
export type StatsRange = 7 | 30 | 90;

export interface DailyTotals {
  nursingTotal: number;
  bottleTotal: number;
  pumpingTotal: number;
}

export interface DailyDataPoint {
  day: string;
  dayKey: string;
  Formula: number;
  'Breast Milk': number;
  total: number;
  'Feeding Count': number;
  'Pumping Volume': number;
  'Pumping Count': number;
}

export interface StatsSnapshot {
  dailyData: DailyDataPoint[];
  todayTotalVol: number;
  todayPumpVol: number;
  elapsedMs: number;
}

const getRecordDateKey = (record: FeedingRecord) => new Date(record.timestamp).toDateString();
const isSameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();

const sortRecordsDesc = (records: FeedingRecord[]) => {
  return [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const recordRepository = {
  sortRecordsDesc,

  filterRecords(records: FeedingRecord[], filter: TimelineFilter) {
    if (!filter) {
      return records;
    }

    switch (filter) {
      case 'NURSING':
        return records.filter((record) => record.type === RecordType.NURSING);
      case 'BOTTLE':
        return records.filter((record) => record.type === RecordType.BOTTLE_FORMULA || record.type === RecordType.BOTTLE_MILK);
      case 'PUMPING':
        return records.filter((record) => record.type === RecordType.PUMPING);
      default:
        return records;
    }
  },

  getOrderedDateKeys(records: FeedingRecord[]) {
    const seen = new Set<string>();
    const ordered: string[] = [];

    records.forEach((record) => {
      const dateKey = getRecordDateKey(record);
      if (!seen.has(dateKey)) {
        seen.add(dateKey);
        ordered.push(dateKey);
      }
    });

    return ordered;
  },

  getRecordsForVisibleDays(records: FeedingRecord[], orderedDateKeys: string[], visibleDayCount: number) {
    const visibleDateKeys = new Set(orderedDateKeys.slice(0, visibleDayCount));

    if (visibleDateKeys.size === 0) {
      return [];
    }

    return records.filter((record) => visibleDateKeys.has(getRecordDateKey(record)));
  },

  getDailyTotals(records: FeedingRecord[], dateToFilter: Date): DailyTotals {
    const dailyRecords = records.filter((record) => isSameDay(new Date(record.timestamp), dateToFilter));

    const nursingTotal = dailyRecords
      .filter((record) => record.type === RecordType.NURSING)
      .reduce((total, record) => total + (record.endTime ? (new Date(record.endTime).getTime() - new Date(record.timestamp).getTime()) : 0), 0) / (1000 * 60);

    const bottleTotal = dailyRecords
      .filter((record) => record.type === RecordType.BOTTLE_FORMULA || record.type === RecordType.BOTTLE_MILK)
      .reduce((total, record) => total + (record.amountMl || 0), 0);

    const pumpingTotal = dailyRecords
      .filter((record) => record.type === RecordType.PUMPING)
      .reduce((total, record) => total + (record.amountMl || 0), 0);

    return {
      nursingTotal,
      bottleTotal,
      pumpingTotal,
    };
  },

  getStatsSnapshot(records: FeedingRecord[], statsRange: StatsRange, userTimeZone: string): StatsSnapshot {
    const startedAt = performance.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDayKey = (date: Date) => {
      return date.toLocaleDateString('en-CA', { timeZone: userTimeZone });
    };

    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (statsRange - 1));

    const dayBuckets = new Map<string, DailyDataPoint>();

    for (let i = 0; i < statsRange; i += 1) {
      const date = new Date(rangeStart);
      date.setDate(rangeStart.getDate() + i);
      const dayKey = getDayKey(date);

      dayBuckets.set(dayKey, {
        day: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        dayKey,
        Formula: 0,
        'Breast Milk': 0,
        total: 0,
        'Feeding Count': 0,
        'Pumping Volume': 0,
        'Pumping Count': 0,
      });
    }

    const todayKey = getDayKey(today);
    let todayTotalVol = 0;
    let todayPumpVol = 0;

    for (const record of records) {
      const timestamp = new Date(record.timestamp);
      const dayKey = getDayKey(timestamp);
      const bucket = dayBuckets.get(dayKey);

      if (!bucket) {
        continue;
      }

      switch (record.type) {
        case RecordType.BOTTLE_FORMULA:
          bucket.Formula += record.amountMl || 0;
          bucket.total += record.amountMl || 0;
          bucket['Feeding Count'] += 1;
          if (dayKey === todayKey) {
            todayTotalVol += record.amountMl || 0;
          }
          break;
        case RecordType.BOTTLE_MILK:
          bucket['Breast Milk'] += record.amountMl || 0;
          bucket.total += record.amountMl || 0;
          bucket['Feeding Count'] += 1;
          if (dayKey === todayKey) {
            todayTotalVol += record.amountMl || 0;
          }
          break;
        case RecordType.NURSING:
          bucket['Feeding Count'] += 1;
          break;
        case RecordType.PUMPING:
          bucket['Pumping Volume'] += record.amountMl || 0;
          bucket['Pumping Count'] += 1;
          if (dayKey === todayKey) {
            todayPumpVol += record.amountMl || 0;
          }
          break;
        default:
          break;
      }
    }

    return {
      dailyData: Array.from(dayBuckets.values()),
      todayTotalVol,
      todayPumpVol,
      elapsedMs: performance.now() - startedAt,
    };
  },
};
