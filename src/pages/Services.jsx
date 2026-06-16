import React from 'react';
import { MessageSquare, Calendar, Video, ShieldCheck } from 'lucide-react';
import AgentMeetingRoom from '../components/AgentMeetingRoom';

const Services = () => {
  const agents = [
    { name: 'Dr. Silva', role: 'Médico Clínico', status: 'Online', type: 'human' },
    { name: 'Nutri AI', role: 'Nutricionista', status: 'Analisando Dieta', type: 'ai' },
    { name: 'Coach Alex', role: 'Preparador Físico', status: 'Online', type: 'human' },
    { name: 'Zen Mind', role: 'Especialista Mindfulness', status: 'Disponível', type: 'ai' }
  ];

  return (
    <div className="module-container">
      <header className="page-header">
        <h1 className="neon-text">Serviços</h1>
        <p>Seu time de agentes e especialistas trabalhando juntos</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        
        {agents.map((agent, idx) => (
          <div key={idx} className="glass" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
            {agent.type === 'ai' && <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: 'var(--primary)', color: '#000', fontSize: '10px', fontWeight: 'bold', borderBottomLeftRadius: '8px' }}>IA AGENT</div>}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck color={agent.type === 'ai' ? 'var(--primary)' : 'var(--text-muted)'} size={32} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '18px' }}>{agent.name}</strong>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{agent.role}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: agent.status === 'Online' ? '#10b981' : 'var(--primary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: agent.status === 'Online' ? '#10b981' : 'var(--primary)' }}></div>
              {agent.status}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} /> Chat
              </button>
              {agent.type === 'human' && (
                <button style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} /> Agendar
                </button>
              )}
            </div>
          </div>
        ))}

      </div>

      <div style={{ marginTop: '48px' }}>
        <AgentMeetingRoom />
      </div>
    </div>
  );
};

export default Services;
