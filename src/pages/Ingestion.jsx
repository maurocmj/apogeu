import React, { useState } from 'react';
import { Droplet, Camera, Utensils, CheckCircle2, AlertTriangle, Apple, Target } from 'lucide-react';
import AgentBubbleCard from '../components/AgentBubbleCard';
import ActionPlanCard from '../components/ActionPlanCard';
import WeeklyNutritionPlan from '../components/WeeklyNutritionPlan';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Ingestion.css';

const qualityData = [
  { day: 'Seg', score: 85, target: 90 },
  { day: 'Ter', score: 92, target: 90 },
  { day: 'Qua', score: 78, target: 90 },
  { day: 'Qui', score: 88, target: 90 },
  { day: 'Sex', score: 95, target: 90 },
  { day: 'Sáb', score: 82, target: 90 },
  { day: 'Dom', score: 94, target: 90 },
];

const mealsData = [
  {
    id: 1,
    name: 'Café da Manhã',
    desc: 'Ovos mexidos, pão integral e café preto',
    macros: { kcal: 340, p: 22, c: 30, g: 14 },
    score: 9.2,
    feedback: 'Excelente equilíbrio para início do dia.',
    status: 'good'
  },
  {
    id: 2,
    name: 'Almoço',
    desc: 'Peito de frango grelhado, arroz integral, feijão e salada mista',
    macros: { kcal: 520, p: 45, c: 55, g: 12 },
    score: 9.8,
    feedback: 'Perfeito para recuperação muscular pós-treino longo.',
    status: 'excellent'
  },
  {
    id: 3,
    name: 'Lanche da Tarde',
    desc: 'Barra de proteína e maçã',
    macros: { kcal: 210, p: 15, c: 25, g: 6 },
    score: 7.5,
    feedback: 'Poderia ter menos açúcar processado baseado nos seus exames.',
    status: 'warning'
  },
  {
    id: 4,
    name: 'Jantar',
    desc: 'Salmão assado com legumes no vapor',
    macros: { kcal: 480, p: 38, c: 15, g: 28 },
    score: 9.5,
    feedback: 'Rico em Ômega-3, ótimo para sua inflamação articular.',
    status: 'good'
  }
];

const Ingestion = () => {
  const [water, setWater] = useState(1.5);
  
  return (
    <div className="ingestion-container">
      <header className="page-header">
        <h1 className="neon-text">Nutrição & Hidratação</h1>
        <p>Ajuste dinâmico baseado no seu treino diário e perfil metabólico</p>
      </header>

      <div className="ingestion-grid">
        
        {/* Left Column: Water & Chart */}
        <div className="ingestion-left-col">
          {/* Water tracking */}
          <div className="glass card text-center flex-col-center">
            <h2 className="card-title">Consumo de Água</h2>
            
            <div className="water-circle">
              <div className="water-fill" style={{ height: `${Math.min((water / 2.5) * 100, 100)}%` }}></div>
              <div className="water-content">
                <span className="display-number neon-text">{water.toFixed(1)}L</span>
                <span className="water-target">Meta: 2.5L</span>
              </div>
            </div>

            <div className="water-controls">
              <button className="btn-water minus" onClick={() => setWater(Math.max(0, water - 0.25))}>-</button>
              <button className="btn-water plus" onClick={() => setWater(Math.min(2.5, water + 0.25))}>+</button>
            </div>
            <p className="water-tip">Seu treino de hoje exigirá +500ml do que o normal.</p>
          </div>

          {/* Quality Chart */}
          <div className="glass card">
            <h2 className="card-title">Equilíbrio de Ingestão vs Gasto</h2>
            <p className="chart-desc">Score baseado nas necessidades do treino diário e exames de sangue.</p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(9, 10, 15, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Meta (90)', fill: '#f59e0b', fontSize: 12 }} />
                  <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Meals History */}
        <div className="ingestion-right-col glass card">
          <div className="meals-header">
            <h2 className="card-title">Refeições do Dia (Histórico)</h2>
            <button className="btn-camera">
              <Camera size={18} /> Analisar Prato (IA)
            </button>
          </div>

          <div className="meals-list">
            {mealsData.map((meal) => (
              <div key={meal.id} className={`meal-item ${meal.status}`}>
                <div className="meal-icon-wrapper">
                  <Utensils size={24} />
                  <div className="meal-score">{meal.score}</div>
                </div>
                <div className="meal-details">
                  <div className="meal-title-row">
                    <h4>{meal.name}</h4>
                    {meal.status === 'warning' ? <AlertTriangle size={16} color="#f59e0b" /> : <CheckCircle2 size={16} color="#10b981" />}
                  </div>
                  <p className="meal-desc">{meal.desc}</p>
                  
                  <div className="meal-macros">
                    <span className="macro kcal">{meal.macros.kcal} kcal</span>
                    <span className="macro prot">P: {meal.macros.p}g</span>
                    <span className="macro carb">C: {meal.macros.c}g</span>
                    <span className="macro fat">G: {meal.macros.g}g</span>
                  </div>
                  
                  <div className="meal-feedback">
                    <strong>IA:</strong> {meal.feedback}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="meal-placeholder">
              <p>Adicione mais uma refeição ou escaneie seu lanche da noite.</p>
            </div>
          </div>
        </div>

        {/* Third Column (or pushed right): Nutri Agent Chat & Plan */}
        <div className="ingestion-chat-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AgentBubbleCard 
            agentId="nutri"
            agentName="Nutri Agent" 
            icon={Apple} 
            agentColor="#10b981" 
            message="Seu almoço foi excelente! Para o jantar, como você gastou bastante energia no treino, recomendo manter a proteína alta, mas podemos adicionar um carboidrato complexo leve. Que tal batata doce?" 
          />

          <ActionPlanCard 
            title="Foco dos Próximos 3 Dias"
            icon={Target}
            color="#10b981"
            items={[
              "Aumentar hidratação para 3L diários",
              "Cortar açúcar adicionado pós 18h",
              "Incluir folhas verde-escuras no jantar"
            ]}
          />
        </div>

      </div>

      {/* Planilha Detalhada */}
      <WeeklyNutritionPlan />
    </div>
  );
};

export default Ingestion;
