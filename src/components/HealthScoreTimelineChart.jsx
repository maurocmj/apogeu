import React, { useState, useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const categoryMapping = {
  'Cardiovascular': ['colesterol', 'hdl', 'ldl', 'triglicerideos', 'triglicerides', 'vldl', 'apolipoproteina', 'pressao', 'pa', 'frequencia', 'coracao', 'eletro', 'eco'],
  'Metabólico': ['glicose', 'glicemia', 'insulina', 'glicada', 'acido_urico', 'hba1c', 'peso', 'imc', 'gordura', 'tireoide', 'tsh', 't4', 'metabolismo'],
  'Neurológico': ['cortisol', 'b12', 'sodio', 'potassio', 'sono', 'estresse', 'ansiedade', 'cognitivo'],
  'Imunológico': ['leucocitos', 'linfocitos', 'pcr', 'plaquetas', 'proteina_c', 'hiv', 'htlv', 'treponema', 'hepatite', 'hbsag', 'hcv', 'imunidade'],
  'Órgãos Vitais': ['creatinina', 'ureia', 'tgo', 'tgp', 'gama', 'bilirrubina', 'prostata', 'bexiga', 'hepatico', 'rim', 'pulmao', 'figado', 'vesical'],
  'Estrutural': ['calcio', 'vitamina_d', 'ferro', 'ferritina', 'magnesio', 'testosterona', 'osso', 'musculo', 'carcinoma', 'pele', 'varicocele', 'lesao', 'tumor', 'massa'],
};

const themes = [
  { key: 'Cardiovascular', color: '#3b82f6' },
  { key: 'Metabólico', color: '#10b981' },
  { key: 'Neurológico', color: '#8b5cf6' },
  { key: 'Imunológico', color: '#ec4899' },
  { key: 'Órgãos Vitais', color: '#f59e0b' },
  { key: 'Estrutural', color: '#00e5ff' }
];

const mockTimelineData = [
  { name: 'Jan', 'Geral': 76, 'Cardiovascular': 75, 'Metabólico': 70, 'Neurológico': 82, 'Imunológico': 88, 'Órgãos Vitais': 80, 'Estrutural': 65 },
  { name: 'Fev', 'Geral': 77, 'Cardiovascular': 78, 'Metabólico': 72, 'Neurológico': 80, 'Imunológico': 85, 'Órgãos Vitais': 82, 'Estrutural': 68 }
];

const HealthScoreTimelineChart = ({ exams = [] }) => {
  const [hoveredLine, setHoveredLine] = useState(null);

  const chartData = useMemo(() => {
    if (!exams || exams.length === 0) return mockTimelineData;

    const sorted = [...exams].sort((a, b) => new Date(a.collection_date) - new Date(b.collection_date));
    
    // Group exams by unique date string
    const groupedExams = {};
    sorted.forEach(exam => {
      const dateObj = new Date(exam.collection_date);
      const name = `${dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')} ${dateObj.getFullYear().toString().slice(2)}`;
      if (!groupedExams[name]) groupedExams[name] = [];
      groupedExams[name].push(exam);
    });

    const allBiomarkersAccumulated = {};
    const result = [];
    const systems = ['Cardiovascular', 'Metabólico', 'Neurológico', 'Imunológico', 'Órgãos Vitais', 'Estrutural'];

    Object.entries(groupedExams).forEach(([name, examsGroup]) => {
      examsGroup.forEach(exam => {
        if (exam.biomarkers) {
          Object.entries(exam.biomarkers).forEach(([key, value]) => {
            const status = typeof value === 'object' && value !== null ? value.status : 'normal';
            const realVal = typeof value === 'object' && value !== null ? value.value : value;
            allBiomarkersAccumulated[key] = { status, value: realVal };
          });
        }
      });

      const dataPoint = { 
        time: new Date(examsGroup[0].collection_date).getTime(), 
        displayDate: name,
        name: name,
        Geral: 0 
      };
      
      let totalSystemScore = 0;
      let systemsWithData = 0;

      systems.forEach(system => {
        const relatedKeys = categoryMapping[system] || [];
        let penalty = 0;
        let hasData = false;

        relatedKeys.forEach(bk => {
          const foundKey = Object.keys(allBiomarkersAccumulated).find(k => {
            const valObj = allBiomarkersAccumulated[k];
            const keyMatch = k.toLowerCase().includes(bk);
            const valMatch = typeof valObj.value === 'string' && valObj.value.toLowerCase().includes(bk);
            return keyMatch || valMatch;
          });

          if (foundKey) {
            hasData = true;
            const status = (allBiomarkersAccumulated[foundKey].status || 'normal').toLowerCase();
            if (status.includes('attention') || status.includes('warning') || status.includes('alterado') || status.includes('atencao') || status.includes('atenção')) {
              penalty += 1;
            } else if (status.includes('critical') || status.includes('high') || status.includes('low') || status.includes('danger') || status.includes('critico') || status.includes('crítico')) {
              penalty += 2;
            }
          }
        });

        if (hasData) {
          let systemScore = Math.max(1, 5 - penalty);
          let normalizedScore = (systemScore / 5) * 100;
          dataPoint[system] = normalizedScore;
          totalSystemScore += normalizedScore;
          systemsWithData++;
        } else {
          dataPoint[system] = null;
        }
      });

      if (systemsWithData > 0) {
        dataPoint['Geral'] = Math.round(totalSystemScore / systemsWithData);
      } else {
        dataPoint['Geral'] = 100;
      }
      
      result.push(dataPoint);
    });

    return result;
  }, [exams]);

  const getLineOpacity = (key) => {
    if (hoveredLine) {
      return hoveredLine === key ? 1.0 : 0.08;
    }
    return 0.25;
  };

  const getAreaOpacity = () => {
    if (hoveredLine) {
      return hoveredLine === 'Geral' ? 0.35 : 0.08;
    }
    return 0.18;
  };

  const getGeralLineOpacity = () => {
    if (hoveredLine) {
      return hoveredLine === 'Geral' ? 1.0 : 0.3;
    }
    return 1.0;
  };

  const formatDateTick = (unixTime) => {
    const date = new Date(unixTime);
    return `${date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')} ${date.getFullYear().toString().slice(2)}`;
  };

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorGeral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={getAreaOpacity()}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
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
            domain={[20, 100]} 
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

export default HealthScoreTimelineChart;
