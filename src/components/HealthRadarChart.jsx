import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const categoryMapping = {
  'Cardiovascular': ['colesterol', 'hdl', 'ldl', 'triglicerideos', 'triglicerides', 'vldl', 'apolipoproteina', 'pressao', 'pa', 'frequencia', 'coracao', 'eletro', 'eco'],
  'Metabólico': ['glicose', 'glicemia', 'insulina', 'glicada', 'acido_urico', 'hba1c', 'peso', 'imc', 'gordura', 'tireoide', 'tsh', 't4', 'metabolismo'],
  'Neurológico': ['cortisol', 'b12', 'sodio', 'potassio', 'sono', 'estresse', 'ansiedade', 'cognitivo'],
  'Imunológico': ['leucocitos', 'linfocitos', 'pcr', 'plaquetas', 'proteina_c', 'hiv', 'htlv', 'treponema', 'hepatite', 'hbsag', 'hcv', 'imunidade'],
  'Órgãos Vitais': ['creatinina', 'ureia', 'tgo', 'tgp', 'gama', 'bilirrubina', 'prostata', 'bexiga', 'hepatico', 'rim', 'pulmao', 'figado', 'vesical'],
  'Estrutural': ['calcio', 'vitamina_d', 'ferro', 'ferritina', 'magnesio', 'testosterona', 'osso', 'musculo', 'carcinoma', 'pele', 'varicocele', 'lesao', 'tumor', 'massa'],
};

const CustomTick = ({ payload, x, y, textAnchor, stroke, radius, index, hasData }) => {
  return (
    <text
      radius={radius}
      stroke={stroke}
      x={x}
      y={y}
      className="recharts-text recharts-polar-angle-axis-tick-value"
      textAnchor={textAnchor}
      fill={hasData ? 'white' : 'var(--text-muted)'}
      fontSize={12}
      fontWeight={hasData ? 600 : 400}
    >
      <tspan x={x} dy="0em">{payload.value}</tspan>
      {!hasData && (
        <tspan x={x} dy="1.4em" fontSize={10} fill="var(--text-muted)" fontWeight={400}>
          (Sem dados)
        </tspan>
      )}
    </text>
  );
};

const HealthRadarChart = ({ exams = [] }) => {
  const chartData = useMemo(() => {
    const allBiomarkers = {};
    
    const sortedExams = [...exams].sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date));
    
    sortedExams.forEach(exam => {
      if (exam.biomarkers) {
        Object.entries(exam.biomarkers).forEach(([key, value]) => {
          if (!allBiomarkers[key]) {
            const status = typeof value === 'object' && value !== null ? value.status : 'normal';
            const realVal = typeof value === 'object' && value !== null ? value.value : value;
            allBiomarkers[key] = { status, value: realVal };
          }
        });
      }
    });

    const systems = ['Cardiovascular', 'Metabólico', 'Neurológico', 'Imunológico', 'Órgãos Vitais', 'Estrutural'];
    
    return systems.map(system => {
      const relatedKeys = categoryMapping[system] || [];
      let foundCount = 0;
      let penalty = 0;
      
      relatedKeys.forEach(bk => {
        const foundKey = Object.keys(allBiomarkers).find(k => {
          const valObj = allBiomarkers[k];
          const keyMatch = k.toLowerCase().includes(bk);
          const valMatch = typeof valObj.value === 'string' && valObj.value.toLowerCase().includes(bk);
          return keyMatch || valMatch;
        });
        
        if (foundKey) {
          foundCount++;
          const status = (allBiomarkers[foundKey].status || 'normal').toLowerCase();
          
          if (status.includes('attention') || status.includes('warning') || status.includes('alterado') || status.includes('atencao') || status.includes('atenção')) {
            penalty += 1;
          } else if (status.includes('critical') || status.includes('high') || status.includes('low') || status.includes('danger') || status.includes('critico') || status.includes('crítico')) {
            penalty += 2;
          }
        }
      });
      
      const hasData = foundCount > 0;
      
      let realScore = 5 - penalty;
      if (realScore < 1) realScore = 1;
      if (!hasData) realScore = 0; 
      
      return {
        subject: system,
        realScore: realScore,
        maxScore: 5,
        hasData: hasData
      };
    });
  }, [exams]);

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          
          <PolarAngleAxis 
            dataKey="subject" 
            tick={(props) => <CustomTick {...props} hasData={chartData[props.index]?.hasData} />} 
          />
          
          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
          
          {/* Sombra de Valor Máximo para eixos sem dados */}
          <Radar
            name="Max Baseline"
            dataKey="maxScore"
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="3 3"
            fill="transparent"
          />
          
          {/* Polígono Real (Azul) */}
          <Radar
            name="Real Score"
            dataKey="realScore"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="var(--primary)"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthRadarChart;
