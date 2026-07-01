import React, { useState, useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const themes = [
  { key: 'Carga de Treino', color: '#fc4c02' },
  { key: 'Volume', color: '#3b82f6' },
  { key: 'Intensidade', color: '#10b981' }
];



const SportsScoreTimelineChart = ({ activities = [] }) => {
  const [hoveredLine, setHoveredLine] = useState(null);

  const chartData = useMemo(() => {
    if (!activities || activities.length === 0) return [];

    // Filter out activities without rawDate
    const validActivities = activities.filter(a => a.rawDate);
    if (validActivities.length === 0) return [];

    // Sort ascending by date
    const sorted = [...validActivities].sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    // Group by week (using ISO week roughly or just a 7-day chunk from the earliest activity)
    // Actually, grouping by ISO week is better:
    const getWeekKey = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); // Thursday of the week
      const week1 = new Date(d.getFullYear(), 0, 4); // First week of year
      const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    };

    const weeksMap = {};
    sorted.forEach(act => {
      const wk = getWeekKey(act.rawDate);
      if (!weeksMap[wk]) {
        // Find Monday of this week for display
        const d = new Date(act.rawDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(d.setDate(diff));
        
        weeksMap[wk] = {
          weekKey: wk,
          name: `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth()+1).toString().padStart(2, '0')}`,
          rawLoad: 0,
          rawVolume: 0,
          count: 0
        };
      }
      weeksMap[wk].rawLoad += (act.effort || 0);
      weeksMap[wk].rawVolume += (act.rawTime || 0); // seconds
      weeksMap[wk].count += 1;
    });

    const weeks = Object.values(weeksMap).sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    // Calculate intensidades and find max for normalization
    let maxLoad = 0.1;
    let maxVol = 0.1;
    let maxInt = 0.1;

    weeks.forEach(w => {
      w.rawIntensidade = w.count > 0 ? (w.rawLoad / w.count) : 0;
      if (w.rawLoad > maxLoad) maxLoad = w.rawLoad;
      if (w.rawVolume > maxVol) maxVol = w.rawVolume;
      if (w.rawIntensidade > maxInt) maxInt = w.rawIntensidade;
    });

    // Normalize 0-100
    const finalData = weeks.map(w => ({
      name: w.name,
      'Carga de Treino': Math.min(100, Math.round((w.rawLoad / maxLoad) * 100)),
      'Volume': Math.min(100, Math.round((w.rawVolume / maxVol) * 100)),
      'Intensidade': Math.min(100, Math.round((w.rawIntensidade / maxInt) * 100))
    }));

    // If only one week exists, duplicate it to form a line
    if (finalData.length === 1) {
      finalData.unshift({ ...finalData[0], name: 'Início' });
    }

    return finalData.slice(-6); // Keep max last 6 weeks
  }, [activities]);

  const getLineOpacity = (key) => {
    if (hoveredLine) {
      return hoveredLine === key ? 1.0 : 0.08;
    }
    return 0.6;
  };

  const getAreaOpacity = () => {
    if (hoveredLine) {
      return hoveredLine === 'Carga de Treino' ? 0.35 : 0.08;
    }
    return 0.18;
  };

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fc4c02" stopOpacity={getAreaOpacity()}/>
              <stop offset="95%" stopColor="#fc4c02" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: 'rgba(22, 25, 32, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fff'
            }}
            itemStyle={{ padding: '2px 0' }}
          />

          <Area
            type="monotone"
            dataKey="Carga de Treino"
            stroke="#fc4c02"
            strokeWidth={3}
            strokeOpacity={getLineOpacity('Carga de Treino')}
            fill="url(#colorCarga)"
            dot={{ r: 4, strokeWidth: 2, fill: '#161920', strokeOpacity: getLineOpacity('Carga de Treino') }}
            activeDot={{ r: 6 }}
            onMouseEnter={() => setHoveredLine('Carga de Treino')}
            onMouseLeave={() => setHoveredLine(null)}
          />

          {themes.filter(t => t.key !== 'Carga de Treino').map(theme => (
            <Line
              key={theme.key}
              type="monotone"
              dataKey={theme.key}
              stroke={theme.color}
              strokeWidth={2}
              strokeOpacity={getLineOpacity(theme.key)}
              dot={{ r: 2, strokeOpacity: getLineOpacity(theme.key) }}
              activeDot={{ r: 4 }}
              connectNulls={true}
              onMouseEnter={() => setHoveredLine(theme.key)}
              onMouseLeave={() => setHoveredLine(null)}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SportsScoreTimelineChart;
