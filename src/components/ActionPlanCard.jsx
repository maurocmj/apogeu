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
      <div className="action-plan-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="action-plan-icon" style={{ background: `${color}1A`, color: color }}>
            <Icon size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Plano de Ação</span>
            <h3 style={{ color: 'var(--text-main)', fontSize: '16px', margin: 0 }}>{title}</h3>
          </div>
        </div>
        {!accepted ? (
          <button 
            style={{ 
              background: `${color}2A`, 
              border: `1px solid ${color}`, 
              color: color, 
              padding: '6px 12px', 
              borderRadius: '8px', 
              fontSize: '12px', 
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => setAccepted(true)}
            onMouseOver={(e) => e.currentTarget.style.background = `${color}4A`}
            onMouseOut={(e) => e.currentTarget.style.background = `${color}2A`}
          >
            Aceitar
          </button>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '16px' }}>
            {checkedItems.filter(Boolean).length} de {items.length}
          </span>
        )}
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
    </div>
  );
};

export default ActionPlanCard;
