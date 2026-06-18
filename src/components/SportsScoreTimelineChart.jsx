import React, { useState, useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const themes = [
  { key: 'Carga de Treino', color: '#fc4c02' },
  { key: 'Volume', color: '#3b82f6' },
  { key: 'Intensidade', color: '#10b981' }
];

const mockTimelineData = [
  { name: 'Semana 1', 'Carga de Treino': 45, 'Volume': 40, 'Intensidade': 50 },
  { name: 'Semana 2', 'Carga de Treino': 55, 'Volume': 50, 'Intensidade': 60 },
  { name: 'Semana 3', 'Carga de Treino': 50, 'Volume': 45, 'Intensidade': 55 },
  { name: 'Semana 4', 'Carga de Treino': 65, 'Volume': 60, 'Intensidade': 70 },
  { name: 'Semana 5', 'Carga de Treino': 80, 'Volume': 75, 'Intensidade': 85 },
  { name: 'Atual', 'Carga de Treino': 85, 'Volume': 80, 'Intensidade': 90 }
];

const SportsScoreTimelineChart = ({ activities = [] }) => {
  const [hoveredLine, setHoveredLine] = useState(null);

  const chartData = useMemo(() => {
    // Para simplificar, vamos usar dados mock baseados no número de atividades
    // Se não tiver atividades, joga tudo pra perto de zero ou não exibe.
    if (!activities || activities.length === 0) return [];
    return mockTimelineData;
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
