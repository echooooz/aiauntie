import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FeedingRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { recordRepository, DailyDataPoint, StatsRange } from '../services/recordRepository';

interface StatsViewProps {
  records: FeedingRecord[];
}

type FeedingMetric = 'total' | 'formula' | 'breast_milk' | 'count';
type PumpingMetric = 'volume' | 'count';
const StatsView: React.FC<StatsViewProps> = ({ records }) => {
    const [feedingMetric, setFeedingMetric] = useState<FeedingMetric>('total');
    const [pumpingMetric, setPumpingMetric] = useState<PumpingMetric>('volume');
    const [statsRange, setStatsRange] = useState<StatsRange>(30);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const statsSnapshot = useMemo(() => {
    const snapshot = recordRepository.getStatsSnapshot(records, statsRange, userTimeZone);

    if (import.meta.env.DEV) {
      console.info(`[StatsView] Aggregated ${records.length} records into ${snapshot.dailyData.length} days in ${snapshot.elapsedMs.toFixed(2)}ms`);
    }

    return snapshot;
  }, [records, statsRange, userTimeZone]);

  const { dailyData, todayTotalVol, todayPumpVol } = statsSnapshot;

  const feedingMax = useMemo(() => {
      if (feedingMetric === 'count') {
          const max = Math.max(0, ...dailyData.map(d => d['Feeding Count']));
          return max < 5 ? 5 : max + 1;
      }
      const maxVol = Math.max(0, ...dailyData.map(d => d.total));
      return Math.ceil(maxVol / 100) * 100 || 100;
  }, [dailyData, feedingMetric]);

  const pumpingMax = useMemo(() => {
      if (pumpingMetric === 'count') {
           const max = Math.max(0, ...dailyData.map(d => d['Pumping Count']));
           return max < 5 ? 5 : max + 1;
      }
      const maxVol = Math.max(0, ...dailyData.map(d => d['Pumping Volume']));
      return Math.ceil(maxVol / 50) * 50 || 100;
  }, [dailyData, pumpingMetric]);

  const showBarLabels = dailyData.length <= 14;

  const ScrollableBarChart = ({ data, yAxisMax, children, heightClass = "h-64" }: { data: DailyDataPoint[], yAxisMax?: number, children: React.ReactNode, heightClass?: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const scrollToRight = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      };

      // Immediate
      scrollToRight();
      
      // Next frame (after paint)
      const rafId = requestAnimationFrame(scrollToRight);
      
      // Small delay to handle any layout shifts from Recharts or Flexbox
      const timeoutId = setTimeout(scrollToRight, 50);

      return () => {
          cancelAnimationFrame(rafId);
          clearTimeout(timeoutId);
      }
    }, [data.length]);

    // Calculate width to show exactly 7 days
    const widthPercentage = Math.max(100, (data.length / 7) * 100);

    return (
      <div className={`flex ${heightClass} mt-6 relative`}>
        {/* Fixed Y-Axis */}
        <div className="w-10 h-full flex-none z-10 bg-white">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{fontSize: 12, fill: '#9CA3AF'}}
                domain={[0, yAxisMax]}
                width={40}
              />
              <XAxis dataKey="day" height={30} tick={false} axisLine={false} tickLine={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scrollable Chart Area */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto pb-2 pl-2">
          <div style={{ width: `${widthPercentage}%`, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} height={30} />
                <YAxis hide domain={[0, yAxisMax]} />
                <Tooltip
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 50}}
                />
                {children}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (records.length === 0) {
      return <div className="p-8 text-center text-zinc-400">No data to visualize yet.</div>;
  }

  return (
    <div className="space-y-8 pb-24">
      
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
              <p className="text-xs text-zinc-400 uppercase font-bold">Today's Fed</p>
              <p className="text-2xl font-black text-blue-500">{todayTotalVol}<span className="text-sm text-zinc-400 ml-1">ml</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
              <p className="text-xs text-zinc-400 uppercase font-bold">Today's Pump</p>
              <p className="text-2xl font-black text-purple-500">{todayPumpVol}<span className="text-sm text-zinc-400 ml-1">ml</span></p>
          </div>
      </div>

      {/* Feeding Volume Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
        <h3 className="text-lg font-bold text-zinc-800 mb-2">Feeding</h3>
        <MetricTabs
            metrics={{7: '7d', 30: '30d', 90: '90d'}}
            activeMetric={statsRange}
            onSelect={setStatsRange}
        />
        <MetricTabs
            metrics={{'total': 'Total', 'formula': 'Formula', 'breast_milk': 'Breast Milk', 'count': 'Count'}}
            activeMetric={feedingMetric}
            onSelect={setFeedingMetric}
        />
        <ScrollableBarChart data={dailyData} yAxisMax={feedingMax}>
            {feedingMetric === 'total' && <Bar dataKey="total" stackId="a" fill="#38BDF8" radius={[4, 4, 4, 4]} barSize={20} label={showBarLabels ? { position: 'top', fill: '#38BDF8', fontSize: 12 } : false} />}
            {feedingMetric === 'formula' && <Bar dataKey="Formula" fill="#60A5FA" radius={[4, 4, 4, 4]} barSize={20} label={showBarLabels ? { position: 'top', fill: '#60A5FA', fontSize: 12 } : false} />}
            {feedingMetric === 'breast_milk' && <Bar dataKey="Breast Milk" fill="#38BDF8" radius={[4, 4, 4, 4]} barSize={20} label={showBarLabels ? { position: 'top', fill: '#38BDF8', fontSize: 12 } : false} />}
            {feedingMetric === 'count' && <Bar dataKey="Feeding Count" fill="#F472B6" radius={[4, 4, 4, 4]} barSize={20} label={showBarLabels ? { position: 'top', fill: '#F472B6', fontSize: 12 } : false} />}
        </ScrollableBarChart>
      </div>

       {/* Pumping Volume Chart */}
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
        <h3 className="text-lg font-bold text-zinc-800 mb-2">Pumping Output</h3>
        <MetricTabs
            metrics={{'volume': 'Volume', 'count': 'Count'}}
            activeMetric={pumpingMetric}
            onSelect={setPumpingMetric}
        />
        <ScrollableBarChart data={dailyData} yAxisMax={pumpingMax} heightClass="h-48">
            {pumpingMetric === 'volume' && <Bar dataKey="Pumping Volume" fill="#A78BFA" radius={[6, 6, 6, 6]} barSize={20} label={showBarLabels ? { position: 'top', fill: '#A78BFA', fontSize: 12 } : false} />}
            {pumpingMetric === 'count' && <Bar dataKey="Pumping Count" fill="#A78BFA" radius={[6, 6, 6, 6]} barSize={20} label={showBarLabels ? { position: 'top', fill: '#A78BFA', fontSize: 12 } : false} />}
        </ScrollableBarChart>
      </div>
    </div>
  );
};

const MetricTabs = ({ metrics, activeMetric, onSelect }: any) => (
    <div className="flex bg-zinc-100 p-1 rounded-lg">
        {Object.entries(metrics).map(([key, label]) => (
            (() => {
                const resolvedKey = typeof activeMetric === 'number' ? Number(key) : key;
                return (
            <button
                key={String(resolvedKey)}
                onClick={() => onSelect(resolvedKey)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${activeMetric === resolvedKey ? 'bg-white shadow text-zinc-900' : 'text-zinc-400'}`}
            >
                {label as string}
            </button>
                );
            })()
        ))}
    </div>
);


export default StatsView;
