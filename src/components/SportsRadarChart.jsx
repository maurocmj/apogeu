import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const CustomTick = ({ payload, x, y, textAnchor, stroke, radius, index }) => {
  return (
    <text
      radius={radius}
      stroke={stroke}
      x={x}
      y={y}
      className="recharts-text recharts-polar-angle-axis-tick-value"
      textAnchor={textAnchor}
      fill="white"
      fontSize={12}
      fontWeight={600}
    >
      <tspan x={x} dy="0em">{payload.value}</tspan>
    </text>
  );
};

const SportsRadarChart = ({ activities = [] }) => {
  // Para fins de demonstração, vamos gerar dados fictícios baseados na presença de atividades
  // Em um ambiente real, isso seria calculado no backend cruzando ritmo, duração e FC.
  const chartData = useMemo(() => {
    const hasData = activities.length > 0;
    
    // Se tiver dados, mostramos um shape focado em endurance. Se não, tudo zero (ou base).
    return [
      { subject: 'Resistência', realScore: hasData ? 4.5 : 0, maxScore: 5 },
      { subject: 'Velocidade', realScore: hasData ? 3.2 : 0, maxScore: 5 },
      { subject: 'Consistência', realScore: hasData ? 4.8 : 0, maxScore: 5 },
      { subject: 'Volume', realScore: hasData ? 4.0 : 0, maxScore: 5 },
      { subject: 'Intensidade', realScore: hasData ? 3.8 : 0, maxScore: 5 },
    ];
  }, [activities]);

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          
          <PolarAngleAxis 
            dataKey="subject" 
            tick={(props) => <CustomTick {...props} />} 
          />
          
          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
          
          {/* Baseline Máxima (Tracejado) */}
          <Radar
            name="Max Baseline"
            dataKey="maxScore"
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="3 3"
            fill="transparent"
          />
          
          {/* Polígono Real (Laranja) */}
          <Radar
            name="Performance Real"
            dataKey="realScore"
            stroke="#fc4c02"
            strokeWidth={2}
            fill="#fc4c02"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SportsRadarChart;
