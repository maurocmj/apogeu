import React, { useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mockTimelineData = [
  { name: 'Jan', 'Geral': 76, 'Cardiovascular': 75, 'Metabólico': 70, 'Neurológico': 82, 'Imunológico': 88, 'Órgãos Vitais': 80, 'Estrutural': 65 },
  { name: 'Fev', 'Geral': 77, 'Cardiovascular': 78, 'Metabólico': 72, 'Neurológico': 80, 'Imunológico': 85, 'Órgãos Vitais': 82, 'Estrutural': 68 },
  { name: 'Mar', 'Geral': 78, 'Cardiovascular': 82, 'Metabólico': 75, 'Neurológico': 78, 'Imunológico': 82, 'Órgãos Vitais': 84, 'Estrutural': 70 },
  { name: 'Abr', 'Geral': 81, 'Cardiovascular': 80, 'Metabólico': 83, 'Neurológico': 85, 'Imunológico': 80, 'Órgãos Vitais': 85, 'Estrutural': 75 },
  { name: 'Mai', 'Geral': 84, 'Cardiovascular': 85, 'Metabólico': 80, 'Neurológico': 88, 'Imunológico': 84, 'Órgãos Vitais': 88, 'Estrutural': 78 },
  { name: 'Jun', 'Geral': 90, 'Cardiovascular': 90, 'Metabólico': 85, 'Neurológico': 90, 'Imunológico': 92, 'Órgãos Vitais': 90, 'Estrutural': 82 }
];

const themes = [
  { key: 'Cardiovascular', color: '#3b82f6' },
  { key: 'Metabólico', color: '#10b981' },
  { key: 'Neurológico', color: '#8b5cf6' },
  { key: 'Imunológico', color: '#ec4899' },
  { key: 'Órgãos Vitais', color: '#f59e0b' },
  { key: 'Estrutural', color: '#00e5ff' }
];

const HealthScoreTimelineChart = () => {
  const [hoveredLine, setHoveredLine] = useState(null);

  const getLineOpacity = (key) => {
    if (hoveredLine) {
      return hoveredLine === key ? 1.0 : 0.08;
    }
    return 0.25; // Dimmed by default
  };

  const getAreaOpacity = () => {
    if (hoveredLine) {
      return hoveredLine === 'Geral' ? 0.35 : 0.08;
    }
    return 0.18; // Prominent by default
  };

  const getGeralLineOpacity = () => {
    if (hoveredLine) {
      return hoveredLine === 'Geral' ? 1.0 : 0.3;
    }
    return 1.0; // Prominent by default
  };

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={mockTimelineData}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorGeral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={getAreaOpacity()}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
          />
          <YAxis 
            domain={[50, 100]} 
            stroke="var(--text-muted)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(22, 25, 32, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fff'
            }}
            itemStyle={{ padding: '2px 0' }}
          />

          
          {/* Área Principal (Geral) com Preenchimento */}
          <Area
            type="monotone"
            dataKey="Geral"
            stroke="#ffffff"
            strokeWidth={3}
            strokeDasharray="5 5"
            strokeOpacity={getGeralLineOpacity()}
            fill="url(#colorGeral)"
            dot={{ r: 4, strokeWidth: 2, fill: '#161920', strokeOpacity: getGeralLineOpacity() }}
            activeDot={{ r: 6 }}
            onMouseEnter={() => setHoveredLine('Geral')}
            onMouseLeave={() => setHoveredLine(null)}
          />

          {/* Linhas de Apoio (Sistemas individuais) */}
          {themes.map(theme => (
            <Line
              key={theme.key}
              type="monotone"
              dataKey={theme.key}
              stroke={theme.color}
              strokeWidth={2}
              strokeOpacity={getLineOpacity(theme.key)}
              dot={{ r: 2, strokeOpacity: getLineOpacity(theme.key) }}
              activeDot={{ r: 4 }}
              onMouseEnter={() => setHoveredLine(theme.key)}
              onMouseLeave={() => setHoveredLine(null)}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthScoreTimelineChart;
