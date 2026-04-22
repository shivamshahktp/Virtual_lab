import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AnalyticsPanel = ({ data }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded p-4 h-64 flex flex-col">
      <h2 className="text-sm text-gray-400 mb-2">LIVE KINETIC ENERGY (System Total)</h2>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" hide={true} />
            <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} 
              itemStyle={{ color: '#38bdf8' }}
            />
            <Line 
              type="monotone" 
              dataKey="energy" 
              stroke="#38bdf8" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} // Disable animation for better live performance
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsPanel;