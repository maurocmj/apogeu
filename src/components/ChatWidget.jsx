import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import './ChatWidget.css';

const ChatWidget = ({ 
  agentName = 'Cérebro IA', 
  icon: Icon = Bot, 
  agentColor = 'var(--primary)', 
  initialMessage = 'Olá, Mauro. Como posso ajudar?',
  context = ''
}) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: initialMessage }
  ]);
  const [input, setInput] = useState('');

  React.useEffect(() => {
    setMessages(prev => {
      const newMsgs = [...prev];
      if (newMsgs[0]?.role === 'assistant') {
        newMsgs[0].text = initialMessage;
      }
      return newMsgs;
    });
  }, [initialMessage]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const newMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Você é o ${agentName}, um agente inteligente da plataforma Apogeu. Você ajuda o usuário com sua saúde.\n\n${context ? `Aqui estão os dados clínicos do usuário para referência:\n${context}` : ''}` },
            ...messages.map(m => ({ role: m.role, content: m.text })),
            { role: 'user', content: input }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.choices[0].message.content }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Desculpe, ocorreu um erro na conexão." }]);
    }
  };

  return (
    <div className="chat-widget-container glass">
      
      <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-bubble" style={{ lineHeight: '1.5' }}>
              {msg.text && typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (
                <span key={i} style={{ display: 'block', marginBottom: line.trim() === '' ? '8px' : '4px' }}>
                  {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={j} style={{ fontWeight: '700', color: msg.role === 'user' ? 'white' : 'var(--text-main)' }}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                  })}
                </span>
              )) : msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <form className="chat-input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chat..."
        />
        <button type="submit" className="chat-send-btn">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
