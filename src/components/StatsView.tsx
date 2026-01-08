import React from 'react';
import { FeedingRecord, RecordType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface StatsViewProps {
  records: FeedingRecord[];
}

const StatsView: React.FC<StatsViewProps> = ({ records }) => {
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const last7Days = getLast7Days();

  // 1. Feeding Volume (Stacked: Formula vs Breast Milk)
  const feedingData = last7Days.map(day => {
    const formula = records
      .filter(r => r.timestamp.startsWith(day) && r.type === RecordType.BOTTLE_FORMULA)
      .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
    
    const breastMilk = records
      .filter(r => r.timestamp.startsWith(day) && r.type === RecordType.BOTTLE_MILK)
      .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
    
    return {
      day: day.slice(5), // MM-DD
      Formula: formula,
      'Breast Milk': breastMilk,
      total: formula + breastMilk
    };
  });

  // 2. Pumping Volume
  const pumpingData = last7Days.map(day => {
    const vol = records
      .filter(r => r.timestamp.startsWith(day) && r.type === RecordType.PUMPING)
      .reduce((acc, curr) => acc + (curr.amountMl || 0), 0);
    return {
        day: day.slice(5),
        volume: vol
    }
  });

  // 3. Count by Type (Generalized)
  const typeCounts = records.reduce((acc, curr) => {
    let key = curr.type as string;
    if (key === RecordType.BOTTLE_FORMULA) key = 'Formula';
    if (key === RecordType.BOTTLE_MILK) key = 'Bottle Milk';
    
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(typeCounts).map(type => ({
    name: type,
    value: typeCounts[type]
  }));

  const COLORS: Record<string, string> = {
    'Formula': '#60A5FA', // Blue
    'Bottle Milk': '#38BDF8', // Sky
    [RecordType.NURSING]: '#F472B6', // Pink
    [RecordType.PUMPING]: '#A78BFA', // Purple
    [RecordType.DIAPER]: '#FBBF24', // Yellow
    [RecordType.SLEEP]: '#818CF8', // Indigo
    [RecordType.OTHER]: '#9CA3AF'
  };

  if (records.length === 0) {
      return <div className="p-8 text-center text-zinc-400">No data to visualize yet.</div>;
  }

  // Calculate today's totals for quick summary
  const today = new Date().toISOString().split('T')[0];
  const todayFormula = feedingData.find(d => new Date().toISOString().includes(d.day.replace('-','/')))?.Formula || 0; // Rough match, better to use filter
  const todayRecs = records.filter(r => r.timestamp.startsWith(today));
  
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
        <h3 className="text-lg font-bold text-zinc-800 mb-6">Feeding Volume (Last 7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feedingData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <Tooltip 
                cursor={{fill: '#F3F4F6'}}
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
              />
              <Legend />
              <Bar dataKey="Formula" stackId="a" fill="#60A5FA" radius={[0, 0, 4, 4]} barSize={20} />
              <Bar dataKey="Breast Milk" stackId="a" fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

       {/* Pumping Volume Chart */}
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
        <h3 className="text-lg font-bold text-zinc-800 mb-6">Pumping Output</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pumpingData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
              <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
              <Bar dataKey="volume" fill="#A78BFA" radius={[6, 6, 6, 6]} barSize={20} />
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
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS[entry.name as string] || '#ccc'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
             {pieData.map(d => (
                 <div key={d.name} className="flex items-center text-xs text-zinc-500">
                     <span className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: COLORS[d.name] || COLORS[d.name as string] || '#ccc'}}></span>
                     {d.name} ({d.value})
                 </div>
             ))}
        </div>
      </div>

    </div>
  );
};

export default StatsView;