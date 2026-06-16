import React, { useState, useEffect, useRef } from 'react';
import { Apple, Dumbbell, Brain, ShieldAlert, Activity, Cpu, Send, User } from 'lucide-react';
import './AgentMeetingRoom.css';

const agentsInfo = {
  nutri: { name: 'Nutri Agent', icon: Apple, color: '#10b981', position: 'seat-tl' },
  mind: { name: 'Mind Agent', icon: Brain, color: '#8b5cf6', position: 'seat-tr' },
  medical: { name: 'Medical Agent', icon: ShieldAlert, color: '#f59e0b', position: 'seat-ml' },
  bio: { name: 'Bio Agent', icon: Activity, color: '#00e5ff', position: 'seat-mr' },
  personal: { name: 'Personal Agent', icon: Dumbbell, color: '#ef4444', position: 'seat-bl' },
  apogeu: { name: 'APOGEU IA', icon: Cpu, color: '#ffffff', position: 'seat-br' },
};

const initialMessages = [
  { id: 1, authorId: 'apogeu', text: 'Bom dia. Reunião de alinhamento semanal iniciada. Como você está se sentindo hoje?' },
];

const AgentMeetingRoom = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [talkingAgent, setTalkingAgent] = useState('apogeu');
  const feedRef = useRef(null);

  useEffect(() => {
    // Stop glow after a while
    const timer = setTimeout(() => {
      setTalkingAgent(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMsg = { id: Date.now(), authorId: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulate Agent Brainstorming Response
    setTimeout(() => {
      setTalkingAgent('medical');
      setMessages(prev => [...prev, { id: Date.now() + 1, authorId: 'medical', text: 'Entendido. Seus exames de CK (Creatina Quinase) ainda não chegaram, mas pelo seu relato de dor, a inflamação muscular deve estar alta.' }]);
      
      setTimeout(() => {
        setTalkingAgent('personal');
        setMessages(prev => [...prev, { id: Date.now() + 2, authorId: 'personal', text: 'Concordo com a análise clínica. Vou alterar sua planilha de treino: cortaremos a corrida de amanhã e focaremos apenas em alongamento passivo.' }]);
        
        setTimeout(() => {
          setTalkingAgent('nutri');
          setMessages(prev => [...prev, { id: Date.now() + 3, authorId: 'nutri', text: 'Excelente. Para ajudar na recuperação tecidual dessa dor, recomendo aumentar a proteína da próxima refeição e adicionar frutas vermelhas (antioxidantes).' }]);
        }, 3500);

      }, 3500);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="meeting-room-wrapper">
      <div className="meeting-table">
        
        {/* Render Agent Seats around the table */}
        {Object.entries(agentsInfo).map(([id, agent]) => {
          const Icon = agent.icon;
          const isTalking = talkingAgent === id;
          return (
            <div 
              key={id}
              className={`agent-seat ${agent.position} ${isTalking ? 'talking' : ''}`}
              style={{ '--agent-color': agent.color, borderColor: agent.color }}
              title={agent.name}
            >
              <Icon color={agent.color} size={28} />
            </div>
          );
        })}

        {/* Chat Feed */}
        <div className="meeting-chat-feed" ref={feedRef}>
          {messages.map(msg => {
            const isUser = msg.authorId === 'user';
            const agent = agentsInfo[msg.authorId];
            const color = isUser ? 'var(--primary)' : agent.color;
            const authorName = isUser ? 'Você' : agent.name;
            const Icon = isUser ? User : agent.icon;

            return (
              <div key={msg.id} className={`meeting-message ${isUser ? 'user' : ''}`}>
                <div className="meeting-msg-avatar" style={{ '--agent-color': color, borderColor: color }}>
                  <Icon size={16} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="meeting-msg-author" style={{ color: color }}>{authorName}</span>
                  <div className="meeting-msg-bubble">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Area */}
        <div className="meeting-input-area">
          <input 
            type="text" 
            placeholder="Relate como se sente para o Conselho..." 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="meeting-btn-send" onClick={handleSend}>
            <Send size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default AgentMeetingRoom;
