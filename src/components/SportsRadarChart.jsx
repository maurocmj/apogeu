import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const tooltipsInfo = {
  'Resistência': 'Resistência: Avalia a capacidade aeróbica com base na duração e estabilidade da FC em treinos longos.',
  'Velocidade': 'Velocidade: Analisa paces de pico, sprints e tempo acumulado em zonas anaeróbicas.',
  'Consistência': 'Consistência: Mede a regularidade e penaliza dias consecutivos sem treino na rotina.',
  'Volume': 'Volume: Pontuação calculada pelo acúmulo semanal de horas (moving time) e quilometragem total.',
  'Intensidade': 'Intensidade: Avalia a carga do treino (Suffer Score), ganho de elevação e % de FC máxima.'
};

const CustomTick = ({ payload, x, y, textAnchor, stroke, radius, index, setTooltipInfo }) => {
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
      style={{ cursor: 'help' }}
      onMouseEnter={(e) => setTooltipInfo({ text: tooltipsInfo[payload.value] || payload.value, title: payload.value, x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setTooltipInfo({ text: tooltipsInfo[payload.value] || payload.value, title: payload.value, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltipInfo(null)}
    >
      <tspan x={x} dy="0em">{payload.value}</tspan>
    </text>
  );
};

const SportsRadarChart = ({ activities = [] }) => {
  const [tooltipInfo, setTooltipInfo] = React.useState(null);

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
        <RadarChart cx="50%" cy="50%" outerRadius="55%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          
          <PolarAngleAxis 
            dataKey="subject" 
            tick={(props) => <CustomTick {...props} setTooltipInfo={setTooltipInfo} />} 
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
      
      {tooltipInfo && (
        <div style={{
          position: 'fixed',
          top: tooltipInfo.y + 15,
          left: tooltipInfo.x + 15,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '12px 16px',
          border: '1px solid rgba(252, 76, 2, 0.3)',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '13px',
          lineHeight: '1.5',
          maxWidth: '260px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(252, 76, 2, 0.15)',
          pointerEvents: 'none'
        }}>
          <strong style={{ display: 'block', color: '#fc4c02', marginBottom: '4px', fontSize: '14px' }}>{tooltipInfo.title}</strong>
          {tooltipInfo.text.split(': ')[1] || tooltipInfo.text}
        </div>
      )}
    </div>
  );
};

export default SportsRadarChart;
