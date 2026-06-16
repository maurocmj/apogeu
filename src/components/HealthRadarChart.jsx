import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const data = [
  { subject: 'Cardiovascular', A: 4.8, fullMark: 5 },
  { subject: 'Metabólico', A: 3.5, fullMark: 5 },
  { subject: 'Hormonal', A: 4.9, fullMark: 5 },
  { subject: 'Função Renal', A: 4.2, fullMark: 5 },
  { subject: 'Inflamação', A: 4.7, fullMark: 5 },
];

const HealthRadarChart = () => {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="A"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthRadarChart;
