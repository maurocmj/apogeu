import React from 'react';
import { Target, CheckCircle2, Circle } from 'lucide-react';
import './GoalTimeline.css';

const GoalTimeline = () => {
  const steps = [
    { title: 'Início', desc: 'Avaliação inicial', status: 'completed' },
    { title: 'Semana 4', desc: 'Adaptação alcançada', status: 'completed' },
    { title: 'Semana 8', desc: 'Aumento de volume', status: 'current' },
    { title: 'Semana 12', desc: 'Maratona 10km', status: 'pending' },
  ];

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <Target size={20} color="var(--primary)" />
        <h3>Objetivo Principal: Correr 10km</h3>
      </div>
      
      <div className="timeline-track">
        {steps.map((step, index) => (
          <div key={index} className={`timeline-step ${step.status}`}>
            <div className="timeline-icon">
              {step.status === 'completed' ? <CheckCircle2 size={24} color="#10b981" /> : 
               step.status === 'current' ? <Circle size={24} fill="var(--primary)" color="var(--primary)" /> : 
               <Circle size={24} color="var(--text-muted)" />}
            </div>
            
            <div className="timeline-content">
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </div>

            {index < steps.length - 1 && <div className="timeline-line"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalTimeline;
