import React from 'react';
import { Smile, Frown, Meh, Moon, Activity, Brain, Target } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import ChatWidget from '../components/ChatWidget';
import ActionPlanCard from '../components/ActionPlanCard';

const sleepData = [
  { day: 'Seg', score: 75 }, { day: 'Ter', score: 82 },
  { day: 'Qua', score: 68 }, { day: 'Qui', score: 90 },
  { day: 'Sex', score: 85 }, { day: 'Sab', score: 92 },
  { day: 'Dom', score: 85 }
];

const stressData = [
  { day: 'Seg', level: 60 }, { day: 'Ter', level: 45 },
  { day: 'Qua', level: 70 }, { day: 'Qui', level: 30 },
  { day: 'Sex', level: 50 }, { day: 'Sab', level: 20 },
  { day: 'Dom', level: 40 }
];

const Monitoring = () => {
  return (
    <div className="module-container">
      <header className="page-header" style={{ marginBottom: '32px' }}>
        <h1 className="neon-text">Monitoramento</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '8px', fontWeight: '400' }}>
          Acompanhamento de Sono, Stress e Sensações
        </p>
      </header>

      <div style={{ display: 'flex', gap: '24px' }}>
        
        {/* Hardware data */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Moon size={20} /> Qualidade do Sono
              </h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                <span className="display-number neon-text" style={{ fontSize: '32px', lineHeight: '1' }}>85</span>
                <span style={{ color: 'var(--text-muted)', paddingBottom: '4px', fontSize: '14px' }}>/ 100</span>
              </div>
            </div>
            
            <div style={{ height: '120px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sleepData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#8b5cf6' }} />
                  <Area type="monotone" dataKey="score" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSleep)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '16px' }}>Recuperação profunda adequada. Fase REM atingiu 2h na última noite.</p>
          </div>

          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Activity size={20} /> Nível de Stress (HRV)
              </h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                <span className="display-number neon-text" style={{ fontSize: '32px', lineHeight: '1', color: '#10b981' }}>Relaxado</span>
              </div>
            </div>

            <div style={{ height: '120px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stressData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#10b981' }} />
                  <Area type="monotone" dataKey="level" stroke="#10b981" fillOpacity={1} fill="url(#colorStress)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '16px' }}>Variação da frequência cardíaca estável. Boa adaptação aos treinos recentes.</p>
          </div>
        </div>

        {/* Sensations input (Flo style) */}
        <div className="glass" style={{ flex: 1, padding: '24px', borderRadius: '12px' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '24px' }}>Como você se sente?</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
              <Smile color="#10b981" size={32} />
              <span>Bem / Disposto</span>
            </button>
            <button style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
              <Meh color="#f59e0b" size={32} />
              <span>Cansaço</span>
            </button>
            <button style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
              <Frown color="#ef4444" size={32} />
              <span>Dores</span>
            </button>
            <button style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
              <Moon color="#8b5cf6" size={32} />
              <span>Fadiga Mental</span>
            </button>
          </div>

          <textarea 
            placeholder="Anotações adicionais (ex: Dor leve no joelho pós-treino)..."
            style={{ width: '100%', marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'var(--font-body)', minHeight: '100px', resize: 'none' }}
          ></textarea>

          <button className="btn-primary neon-border" style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'rgba(0, 229, 255, 0.1)' }}>
            Registrar
          </button>
        </div>

        {/* Mind Agent Chat & Plan */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ChatWidget 
              agentName="Mind Agent" 
              icon={Brain} 
              agentColor="#8b5cf6" 
              initialMessage="Sua fase de sono profundo não foi ideal na noite passada. Sabendo que você tem treino pesado hoje, recomendo um cochilo de 20 min à tarde se possível." 
            />
          </div>

          <ActionPlanCard 
            title="Protocolo de Recuperação"
            icon={Target}
            color="#8b5cf6"
            items={[
              "Dormir impreterivelmente às 22h30",
              "Fazer 15 min de meditação guiada antes de deitar",
              "Evitar telas 1h antes do sono"
            ]}
          />
        </div>

      </div>
    </div>
  );
};

export default Monitoring;
