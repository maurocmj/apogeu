import React, { useState } from 'react';
import ChatWidget from '../components/ChatWidget';
import ActionPlanCard from '../components/ActionPlanCard';
import { Activity, Target } from 'lucide-react';
import './Body.css';

const historyData = [
  { month: 'Há 6 meses', weight: 85.0, bf: 22.5, waist: 92, shoulders: 108, leg: 58 },
  { month: 'Há 3 meses', weight: 82.0, bf: 18.0, waist: 86, shoulders: 110, leg: 59 },
  { month: 'Há 1 mês', weight: 79.5, bf: 15.5, waist: 83, shoulders: 111, leg: 60 },
  { month: 'Hoje', weight: 78.5, bf: 14.2, waist: 82, shoulders: 112, leg: 60.5 },
];

const Body = () => {
  const [timelineIndex, setTimelineIndex] = useState(3); // Defaults to "Hoje"
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const currentData = historyData[timelineIndex];

  const handleHover = (pointId, isHovering) => {
    setHoveredPoint(isHovering ? pointId : null);
  };

  return (
    <div className="module-container">
      <header className="page-header">
        <h1 className="neon-text">Evolução Corporal</h1>
        <p>Acompanhamento de medidas e morfologia (Arraste a linha do tempo)</p>
      </header>

      <div className="body-layout" style={{ display: 'flex', gap: '32px', height: 'calc(100vh - 200px)' }}>
        
        <div className="body-visual glass" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* Holographic Body Image 1: Fat (Fades out as time advances) */}
            <img 
              src="/body_fat.png" 
              alt="Holographic Body Fat State" 
              style={{
                position: 'absolute',
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
                opacity: 1 - (timelineIndex / 3),
                transition: 'opacity 0.8s ease-in-out',
                filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.2))'
              }}
            />

            {/* Holographic Body Image 2: Fit (Fades in as time advances) */}
            <img 
              src="/body_fit.png" 
              alt="Holographic Body Fit State" 
              style={{
                position: 'absolute',
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
                opacity: timelineIndex / 3,
                transition: 'opacity 0.8s ease-in-out',
                filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.4))'
              }}
            />
            
            {/* Overlay Measurements (Shown on Hover) */}
            <div className={`measure-point ${hoveredPoint === 'ombro' ? 'visible' : ''}`} style={{ top: '25%', left: '30%' }}>
              <div className="point-dot neon-border"></div>
              <div className="point-label glass">
                Ombros: <strong className="neon-text">{currentData.shoulders} cm</strong>
              </div>
            </div>

            <div className={`measure-point ${hoveredPoint === 'cintura' ? 'visible' : ''}`} style={{ top: '45%', left: '38%' }}>
              <div className="point-dot neon-border"></div>
              <div className="point-label glass">
                Cintura: <strong className="neon-text">{currentData.waist} cm</strong>
              </div>
            </div>

            <div className={`measure-point ${hoveredPoint === 'perna' ? 'visible' : ''}`} style={{ top: '75%', left: '40%' }}>
              <div className="point-dot neon-border"></div>
              <div className="point-label glass">
                Perna: <strong className="neon-text">{currentData.leg} cm</strong>
              </div>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="timeline-slider-container">
            <span className="timeline-label">{historyData[0].month}</span>
            <input 
              type="range" 
              min="0" 
              max="3" 
              step="1" 
              value={timelineIndex}
              onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
              className="time-slider"
            />
            <span className="timeline-label neon-text">Hoje</span>
          </div>

        </div>

        {/* Timeline and Stats */}
        <div className="body-stats glass" style={{ width: '360px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
              Métricas: <span>{currentData.month}</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="stat-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Peso</div>
                <div className="display-number neon-text" style={{ fontSize: '24px' }}>{currentData.weight.toFixed(1)} kg</div>
              </div>
              <div className="stat-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gordura (BF)</div>
                <div className="display-number neon-text" style={{ fontSize: '24px' }}>{currentData.bf.toFixed(1)} %</div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Comparativo Total</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '16px', borderLeft: '2px solid #10b981', paddingLeft: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Peso Total</div>
                <div style={{ color: '#10b981' }}>-6.5 kg</div>
              </div>
              <div style={{ display: 'flex', gap: '16px', borderLeft: '2px solid #10b981', paddingLeft: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gordura</div>
                <div style={{ color: '#10b981' }}>-8.3 %</div>
              </div>
              <div style={{ display: 'flex', gap: '16px', borderLeft: '2px solid var(--primary)', paddingLeft: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Massa Magra</div>
                <div style={{ color: 'var(--primary)' }}>+2.1 kg</div>
              </div>
            </div>
          </div>

          <button className="btn-primary neon-border" style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0, 229, 255, 0.1)' }}>
            Atualizar Medidas (IA)
          </button>
        </div>
        
        {/* Bio Agent Chat & Plan */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ChatWidget 
              agentName="Bio Agent" 
              icon={Activity} 
              agentColor="#00e5ff" 
              initialMessage="Notei que sua inflamação corporal reduziu e o mapa de calor da linha de cintura está 'esfriando' mais rápido. Ótimo trabalho!" 
            />
          </div>

          <ActionPlanCard 
            title="Alvos Morfológicos"
            icon={Target}
            color="#00e5ff"
            items={[
              "Reduzir inflamação abdominal (foco em aeróbico)",
              "Manter dieta hiperproteica para ganho de coxa",
              "Realizar nova pesagem em 7 dias"
            ]}
          />
        </div>

      </div>
    </div>
  );
};

export default Body;
