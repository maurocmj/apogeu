import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const data = [
  { subject: 'Esporte', A: 4.5, fullMark: 5 },
  { subject: 'Sono', A: 3.2, fullMark: 5 },
  { subject: 'Ingestão', A: 4.0, fullMark: 5 },
  { subject: 'Body/Mente', A: 4.8, fullMark: 5 },
  { subject: 'Exames', A: 5.0, fullMark: 5 },
];

const RadarChartScore = () => {
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

export default RadarChartScore;
