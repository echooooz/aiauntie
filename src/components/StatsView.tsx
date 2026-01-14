import React, { useState } from 'react';
import { FeedingRecord, RecordType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';

interface StatsViewProps {
  records: FeedingRecord[];
}

type FeedingMetric = 'total' | 'formula' | 'breast_milk' | 'count';
type PumpingMetric = 'volume' | 'count';

const StatsView: React.FC<StatsViewProps> = ({ records }) => {
    const [feedingMetric, setFeedingMetric] = useState<FeedingMetric>('total');
    const [pumpingMetric, setPumpingMetric] = useState<PumpingMetric>('volume');
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const getDayKey = (date: Date) => {
        return date.toLocaleDateString('en-CA', { timeZone: userTimeZone }); // YYYY-MM-DD
    }

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const last7Days = getLast7Days();

  const dailyData = last7Days.map(day => {
    const dayKey = getDayKey(day);
    const dayRecords = records.filter(r => getDayKey(new Date(r.timestamp)) === dayKey);

    const formula = dayRecords
        .filter(r => r.type === RecordType.BOTTLE_FORMULA)
        .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
    
    const breastMilk = dayRecords
        .filter(r => r.type === RecordType.BOTTLE_MILK)
        .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
    
    const feedingCount = dayRecords
        .filter(r => r.type === RecordType.BOTTLE_FORMULA || r.type === RecordType.BOTTLE_MILK || r.type === RecordType.NURSING).length;

    const pumpingVol = dayRecords
        .filter(r => r.type === RecordType.PUMPING)
        .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);

    const pumpingCount = dayRecords.filter(r => r.type === RecordType.PUMPING).length;

    return {
        day: day.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        Formula: formula,
        'Breast Milk': breastMilk,
        total: formula + breastMilk,
        'Feeding Count': feedingCount,
        'Pumping Volume': pumpingVol,
        'Pumping Count': pumpingCount
    };
  });

  const pieData = Object.values(RecordType).map(type => {
      const count = records.filter(r => r.type === type).length;
      return { name: type, value: count };
  }).filter(d => d.value > 0);

  const COLORS: Record<string, string> = {
    [RecordType.BOTTLE_FORMULA]: '#60A5FA', // Blue
    [RecordType.BOTTLE_MILK]: '#38BDF8', // Sky
    [RecordType.NURSING]: '#F472B6', // Pink
    [RecordType.PUMPING]: '#A78BFA', // Purple
    [RecordType.DIAPER]: '#FBBF24', // Yellow
    [RecordType.SLEEP]: '#818CF8', // Indigo
    [RecordType.OTHER]: '#9CA3AF'
  };

  if (records.length === 0) {
      return <div className="p-8 text-center text-zinc-400">No data to visualize yet.</div>;
  }

  const todayKey = getDayKey(new Date());
  const todayRecs = records.filter(r => getDayKey(new Date(r.timestamp)) === todayKey);
  
  const todayTotalVol = todayRecs.reduce((acc, r) => {
      if (r.type === RecordType.BOTTLE_FORMULA || r.type === RecordType.BOTTLE_MILK) return acc + (r.amountMl || 0);
      return acc;
  }, 0);
  
  const todayPumpVol = todayRecs.reduce((acc, r) => {
      if (r.type === RecordType.PUMPING) return acc + (r.amountMl || 0);
      return acc;
  }, 0);

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
        <h3 className="text-lg font-bold text-zinc-800 mb-2">Feeding (Last 7 Days)</h3>
        <MetricTabs 
            metrics={{'total': 'Total', 'formula': 'Formula', 'breast_milk': 'Breast Milk', 'count': 'Count'}}
            activeMetric={feedingMetric}
            onSelect={setFeedingMetric}
        />
        <div className="h-64 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <Tooltip 
                cursor={{fill: '#F3F4F6'}}
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
              />
              {feedingMetric === 'total' && <Bar dataKey="total" stackId="a" fill="#38BDF8" radius={[4, 4, 4, 4]} barSize={20}>
                <LabelList dataKey="total" position="top" style={{ fill: '#38BDF8', fontSize: '12px' }} formatter={(value: number) => value > 0 ? value : ''}/>
              </Bar>}
              {feedingMetric === 'formula' && <Bar dataKey="Formula" fill="#60A5FA" radius={[4, 4, 4, 4]} barSize={20}>
                <LabelList dataKey="Formula" position="top" style={{ fill: '#60A5FA', fontSize: '12px' }} formatter={(value: number) => value > 0 ? value : ''}/>
              </Bar>}
              {feedingMetric === 'breast_milk' && <Bar dataKey="Breast Milk" fill="#38BDF8" radius={[4, 4, 4, 4]} barSize={20}>
                <LabelList dataKey="Breast Milk" position="top" style={{ fill: '#38BDF8', fontSize: '12px' }} formatter={(value: number) => value > 0 ? value : ''}/>
              </Bar>}
              {feedingMetric === 'count' && <Bar dataKey="Feeding Count" fill="#F472B6" radius={[4, 4, 4, 4]} barSize={20}>
                <LabelList dataKey="Feeding Count" position="top" style={{ fill: '#F472B6', fontSize: '12px' }} formatter={(value: number) => value > 0 ? value : ''}/>
              </Bar>}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

       {/* Pumping Volume Chart */}
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
        <h3 className="text-lg font-bold text-zinc-800 mb-2">Pumping Output</h3>
        <MetricTabs 
            metrics={{'volume': 'Volume', 'count': 'Count'}}
            activeMetric={pumpingMetric}
            onSelect={setPumpingMetric}
        />
        <div className="h-48 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
              {pumpingMetric === 'volume' && <Bar dataKey="Pumping Volume" fill="#A78BFA" radius={[6, 6, 6, 6]} barSize={20}>
                <LabelList dataKey="Pumping Volume" position="top" style={{ fill: '#A78BFA', fontSize: '12px' }} formatter={(value: number) => value > 0 ? value : ''}/>
              </Bar>}
              {pumpingMetric === 'count' && <Bar dataKey="Pumping Count" fill="#A78BFA" radius={[6, 6, 6, 6]} barSize={20}>
                <LabelList dataKey="Pumping Count" position="top" style={{ fill: '#A78BFA', fontSize: '12px' }} formatter={(value: number) => value > 0 ? value : ''}/>
              </Bar>}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
        <h3 className="text-lg font-bold text-zinc-800 mb-4">Activity Breakdown</h3>
        <div className="h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#ccc'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
             {pieData.map(d => (
                 <div key={d.name} className="flex items-center text-xs text-zinc-500">
                     <span className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: COLORS[d.name] || '#ccc'}}></span>
                     {d.name} ({d.value})
                 </div>
             ))}
        </div>
      </div>

    </div>
  );
};

const MetricTabs = ({ metrics, activeMetric, onSelect }: any) => (
    <div className="flex bg-zinc-100 p-1 rounded-lg">
        {Object.entries(metrics).map(([key, label]) => (
            <button
                key={key}
                onClick={() => onSelect(key)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${activeMetric === key ? 'bg-white shadow text-zinc-900' : 'text-zinc-400'}`}
            >
                {label as string}
            </button>
        ))}
    </div>
);


export default StatsView;
