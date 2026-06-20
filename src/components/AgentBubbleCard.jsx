import React from 'react';
import { Bot } from 'lucide-react';
import { useAgentChat } from '../context/AgentChatContext';

const AgentBubbleCard = ({ 
  agentId = 'apogeu',
  agentName = 'Agente IA', 
  icon: Icon = Bot, 
  agentColor = 'var(--primary)', 
  message = '' 
}) => {
  const { openAgentChat } = useAgentChat();

  const hexToRgb = (hex) => {
    if (hex === 'var(--primary)') return '0, 229, 255';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
      : '255, 255, 255';
  };

  const rgbColor = hexToRgb(agentColor);

  return (
    <div 
      onClick={() => openAgentChat(agentId, message)}
      style={{ 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'flex-start',
        cursor: 'pointer',
        width: '100%',
        position: 'relative',
        userSelect: 'none',
        padding: '8px 0'
      }}
    >
      {/* Avatar (Outside on the left) */}
      <div 
        style={{ 
          width: '46px', 
          height: '46px', 
          borderRadius: '50%', 
          background: `rgba(${rgbColor}, 0.12)`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: `2px solid ${agentColor}`,
          flexShrink: 0,
          boxShadow: `0 0 12px rgba(${rgbColor}, 0.2)`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 18px rgba(${rgbColor}, 0.45)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 12px rgba(${rgbColor}, 0.2)`;
        }}
      >
        <Icon size={22} style={{ color: agentColor }} />
      </div>

      {/* Speech Bubble Card */}
      <div 
        className="glass" 
        style={{ 
          flex: 1,
          padding: '16px 20px', 
          borderRadius: '4px 18px 18px 18px', // pointed top-left corner pointing to avatar
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          background: 'rgba(15, 23, 42, 0.45)',
          position: 'relative',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35), 0 0 15px rgba(${rgbColor}, 0.15)`;
          e.currentTarget.style.borderColor = `rgba(${rgbColor}, 0.4)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        }}
      >
        {/* Triangle Tail */}
        <div 
          style={{
            position: 'absolute',
            left: '-8px',
            top: '16px',
            width: '0',
            height: '0',
            borderStyle: 'solid',
            borderWidth: '6px 8px 6px 0',
            borderColor: `transparent rgba(15, 23, 42, 0.7) transparent transparent`,
            pointerEvents: 'none'
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: agentColor, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {agentName}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)', fontWeight: '500' }}>
            Clique para conversar
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default AgentBubbleCard;
