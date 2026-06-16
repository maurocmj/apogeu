import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import './ActionPlanCard.css';

const ActionPlanCard = ({ title, icon: Icon, color, items }) => {
  const [checkedItems, setCheckedItems] = useState(Array(items.length).fill(false));
  const [accepted, setAccepted] = useState(false);

  const toggleItem = (index) => {
    if (!accepted) return;
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  const progress = checkedItems.filter(Boolean).length / items.length;

  return (
    <div className="action-plan-card glass" style={{ '--plan-color': color }}>
      <div className="action-plan-header">
        <div className="action-plan-icon" style={{ background: `${color}1A`, color: color }}>
          <Icon size={24} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Plano de Ação</span>
          <h3 style={{ color: 'var(--text-main)', fontSize: '16px', margin: 0 }}>{title}</h3>
        </div>
      </div>

      <div className="action-plan-list">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={`action-plan-item ${checkedItems[idx] ? 'checked' : ''} ${!accepted ? 'disabled' : ''}`}
            onClick={() => toggleItem(idx)}
          >
            {checkedItems[idx] ? (
              <CheckCircle2 color={color} size={20} className="check-icon" />
            ) : (
              <Circle color="var(--text-muted)" size={20} className="check-icon" />
            )}
            <span className="item-text">{item}</span>
          </div>
        ))}
      </div>

      {!accepted ? (
        <button 
          className="btn-accept-plan" 
          style={{ background: `${color}2A`, borderColor: color, color: color }}
          onClick={() => setAccepted(true)}
        >
          Aceitar Plano
        </button>
      ) : (
        <div className="action-plan-progress">
          <div className="progress-bar-mini" style={{ height: '6px' }}>
            <div className="progress-fill-mini" style={{ width: `${progress * 100}%`, background: color }}></div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {checkedItems.filter(Boolean).length} de {items.length} concluídos
          </span>
        </div>
      )}
    </div>
  );
};

export default ActionPlanCard;
