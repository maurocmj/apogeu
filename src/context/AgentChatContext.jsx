import React, { createContext, useState, useContext } from 'react';

const AgentChatContext = createContext(null);

export const AgentChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState('apogeu');
  
  // Persistent histories for each agent stored globally
  const [conversations, setConversations] = useState({
    apogeu: [{ role: 'assistant', text: 'Olá, Mauro! Sou o APOGEU IA, seu assistente geral. Como posso ajudar você hoje?' }],
    personal: [{ role: 'assistant', text: 'E aí, Mauro! Sou seu Personal Agent. Como está seu ritmo de treinos e sua recuperação hoje?' }],
    mind: [{ role: 'assistant', text: 'Olá, Mauro. Sou o Mind Agent. Vamos conversar sobre como melhorar sua qualidade de sono ou gerenciar seu nível de estresse?' }],
    nutri: [{ role: 'assistant', text: 'Olá, Mauro! Sou o Nutri Agent. Quer falar sobre seu plano alimentar, calorias ou sua hidratação de hoje?' }],
    bio: [{ role: 'assistant', text: 'Olá, Mauro. Sou o Bio Agent. Posso ajudar com suas medições corporais, composição física ou metas de evolução morfológica.' }],
    medical: [{ role: 'assistant', text: 'Olá, Mauro. Sou o Medical Agent. Tem alguma dúvida sobre seus exames clínicos, glicose, colesterol ou outros indicadores de saúde?' }]
  });

  const openAgentChat = (agentId, customMessage) => {
    if (agentId) {
      setActiveAgentId(agentId);
      
      // If a custom card message is provided, make sure it is reflected as the first chat message
      if (customMessage) {
        setConversations(prev => {
          const history = prev[agentId] || [];
          const newHistory = [...history];
          
          // Only replace/set the first message if the user has not started exchanging messages yet
          if (newHistory.length <= 1) {
            newHistory[0] = { role: 'assistant', text: customMessage };
          }
          return {
            ...prev,
            [agentId]: newHistory
          };
        });
      }
    }
    setIsOpen(true);
  };

  return (
    <AgentChatContext.Provider value={{ 
      isOpen, 
      setIsOpen, 
      activeAgentId, 
      setActiveAgentId, 
      conversations, 
      setConversations, 
      openAgentChat 
    }}>
      {children}
    </AgentChatContext.Provider>
  );
};

export const useAgentChat = () => useContext(AgentChatContext);
