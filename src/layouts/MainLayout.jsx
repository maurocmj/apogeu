import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Dumbbell, 
  Activity, 
  Utensils, 
  User, 
  Stethoscope, 
  LogOut,
  Settings,
  Target,
  HeartPulse,
  Link2,
  UserCircle,
  X,
  Send,
  Bot,
  Brain,
  Apple,
  Heart,
  ChevronDown
} from 'lucide-react';
import logo from '../assets/logo.png';
import './MainLayout.css';
import { AgentChatProvider, useAgentChat } from '../context/AgentChatContext';

const APP_VERSION = 'v1.10.0';

// Global Agents Configuration
const AGENTS = [
  { id: 'apogeu', name: 'APOGEU IA', icon: Bot, color: '#00e5ff', welcomeMessage: 'Olá, Mauro! Sou o APOGEU IA, seu assistente geral. Como posso ajudar você hoje?' },
  { id: 'personal', name: 'Personal Agent', icon: Dumbbell, color: '#fc4c02', welcomeMessage: 'E aí, Mauro! Sou seu Personal Agent. Como está seu ritmo de treinos e sua recuperação hoje?' },
  { id: 'mind', name: 'Mind Agent', icon: Brain, color: '#8b5cf6', welcomeMessage: 'Olá, Mauro. Sou o Mind Agent. Vamos conversar sobre como melhorar sua qualidade de sono ou gerenciar seu nível de estresse?' },
  { id: 'nutri', name: 'Nutri Agent', icon: Apple, color: '#10b981', welcomeMessage: 'Olá, Mauro! Sou o Nutri Agent. Quer falar sobre seu plano alimentar, calorias ou sua hidratação de hoje?' },
  { id: 'bio', name: 'Bio Agent', icon: User, color: '#00e5ff', welcomeMessage: 'Olá, Mauro. Sou o Bio Agent. Posso ajudar com suas medições corporais, composição física ou metas de evolução morfológica.' },
  { id: 'medical', name: 'Medical Agent', icon: Heart, color: '#10b981', welcomeMessage: 'Olá, Mauro. Sou o Medical Agent. Tem alguma dúvida sobre seus exames clínicos, glicose, colesterol ou outros indicadores de saúde?' }
];

const MainLayoutContent = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const messagesEndRef = useRef(null);
  
  // Floating Chat State from Context
  const { isOpen, setIsOpen, activeAgentId, setActiveAgentId, conversations, setConversations, chatContext, globalUserContext } = useAgentChat();
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Auto-switch agent based on current path/module
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.includes('/esportivo')) setActiveAgentId('personal');
    else if (pathname.includes('/monitoramento')) setActiveAgentId('mind');
    else if (pathname.includes('/ingestao')) setActiveAgentId('nutri');
    else if (pathname.includes('/body')) setActiveAgentId('bio');
    else if (pathname.includes('/exames')) setActiveAgentId('medical');
    else setActiveAgentId('apogeu');
  }, [location.pathname, setActiveAgentId]);

  // Scroll chat to bottom when messages or agent changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeAgentId, isOpen]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === 'maurocmj@gmail.com') {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Início', developed: true },
    { path: '/esportivo', icon: <Dumbbell size={20} />, label: 'Esportivo', developed: false },
    { path: '/monitoramento', icon: <Activity size={20} />, label: 'Monitoramento', developed: true },
    { path: '/ingestao', icon: <Utensils size={20} />, label: 'Ingestão', developed: false },
    { path: '/body', icon: <User size={20} />, label: 'Body', developed: false },
    { path: '/perfil', icon: <Target size={20} />, label: 'Perfil e Metas', developed: true },
    { path: '/integracoes', icon: <Link2 size={20} />, label: 'Integrações', developed: true },
    { path: '/exames', icon: <HeartPulse size={20} />, label: 'Saúde', developed: true },
    { path: '/servicos', icon: <Stethoscope size={20} />, label: 'Serviços', developed: false }
  ];

  if (isAdmin) {
    menuItems.push({ path: '/admin', icon: <Settings />, label: 'Super Admin' });
  }

  // Active Agent details
  const activeAgent = AGENTS.find(a => a.id === activeAgentId) || AGENTS[0];
  const activeAgentColor = activeAgent.color;

  const hexToRgb = (hex) => {
    if (hex === 'var(--primary)') return '0, 229, 255';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
      : '0, 229, 255';
  };
  const activeRgb = hexToRgb(activeAgentColor);

  const handleSendFloating = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    
    // Add user message to state
    setConversations(prev => ({
      ...prev,
      [activeAgentId]: [...prev[activeAgentId], userMsg]
    }));
    
    const textToSend = chatInput;
    setChatInput('');
    setIsTyping(true);

    try {
      const currentHistory = conversations[activeAgentId] || [];
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `Você é o ${activeAgent.name}, um agente inteligente da plataforma Apogeu especializada em saúde e esporte de alto rendimento. Responda de forma extremamente objetiva, curta, premium e inteligente em português.\n\nDADOS HISTÓRICOS E REAIS DO USUÁRIO LOGADO:\n${globalUserContext || 'Sem dados históricos carregados do perfil.'}\n\n${chatContext ? `CONTEXTO ADICIONAL DA TELA ATUAL:\n${chatContext}` : ''}` 
            },
            ...currentHistory.map(m => ({ role: m.role, content: m.text })),
            { role: 'user', content: textToSend }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const reply = { role: 'assistant', text: data.choices[0].message.content };
        setConversations(prev => ({
          ...prev,
          [activeAgentId]: [...prev[activeAgentId], reply]
        }));
      }

      if (data.usage) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          supabase.from('ai_token_usage').insert({
            user_id: session.user.id, feature: 'floating_chat_' + activeAgentId, model: 'gpt-4o-mini',
            prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens, total_tokens: data.usage.total_tokens
          }).then();
        }
      }
    } catch (err) {
      console.error("Erro no chat flutuante:", err);
      const errorReply = { role: 'assistant', text: "Desculpe, ocorreu um erro de conexão." };
      setConversations(prev => ({
        ...prev,
        [activeAgentId]: [...prev[activeAgentId], errorReply]
      }));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="layout-container">
      {/* Top Navbar */}
      <header className="top-navbar glass">
        <div className="navbar-brand">
          <img 
            src={logo} 
            alt="Apogeu Logo" 
            className="navbar-logo"
          />
          <div className="navbar-brand-divider"></div>
          <span className="navbar-brand-name">APOGEU</span>
        </div>

        <nav className="navbar-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.developed === false ? 'undeveloped' : ''}`}
              title={item.label}
            >
              <div className="nav-icon">{item.icon}</div>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <span style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            padding: '2px 7px',
            letterSpacing: '0.5px',
            userSelect: 'none'
          }}>{APP_VERSION}</span>
          <div className="nav-item" title="Usuário Logado">
            <UserCircle size={20} color="var(--primary)" />
          </div>
          <button className="nav-item logout" onClick={handleLogout} title="Sair" style={{ padding: '8px' }}>
            <LogOut color="#ef4444" size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* CSS Animations Injector */}
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.25); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* FAB: Floating Action Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: `rgba(${activeRgb}, 0.15)`,
          border: `2px solid ${activeAgentColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: `0 0 20px rgba(${activeRgb}, 0.3)`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) rotate(5deg)';
          e.currentTarget.style.boxShadow = `0 0 28px rgba(${activeRgb}, 0.5)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0)';
          e.currentTarget.style.boxShadow = `0 0 20px rgba(${activeRgb}, 0.3)`;
        }}
      >
        {isOpen ? (
          <X size={24} style={{ color: activeAgentColor }} />
        ) : (
          React.createElement(activeAgent.icon, { size: 24, style: { color: activeAgentColor } })
        )}
      </div>

      {/* Floating Chat Panel */}
      {isOpen && (
        <div 
          className="glass"
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '96px',
            width: '380px',
            height: '520px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            border: `1px solid rgba(${activeRgb}, 0.2)`,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(20px)',
            boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 24px rgba(${activeRgb}, 0.15)`,
            animation: 'fadeInUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Header */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: `rgba(${activeRgb}, 0.05)`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: `rgba(${activeRgb}, 0.15)`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: `1px solid ${activeAgentColor}`
                }}
              >
                {React.createElement(activeAgent.icon, { size: 18, style: { color: activeAgentColor } })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    outline: 'none',
                    fontFamily: 'inherit',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {activeAgent.name}
                  <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>

                {dropdownOpen && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '16px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: `1px solid rgba(${activeRgb}, 0.2)`,
                      borderRadius: '12px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      minWidth: '180px',
                      zIndex: 10000,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {AGENTS.map(agent => {
                      const agentRgb = hexToRgb(agent.color);
                      return (
                        <button
                          key={agent.id}
                          onClick={() => {
                            setActiveAgentId(agent.id);
                            setDropdownOpen(false);
                          }}
                          style={{
                            background: activeAgentId === agent.id ? `rgba(${agentRgb}, 0.15)` : 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = `rgba(${agentRgb}, 0.2)`}
                          onMouseLeave={(e) => e.currentTarget.style.background = activeAgentId === agent.id ? `rgba(${agentRgb}, 0.15)` : 'transparent'}
                        >
                          {React.createElement(agent.icon, { size: 14, style: { color: agent.color } })}
                          {agent.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  Ativo agora
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div 
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {conversations[activeAgentId]?.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div 
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    background: msg.role === 'user' ? `rgba(${activeRgb}, 0.15)` : 'rgba(255, 255, 255, 0.05)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--text-muted)',
                    border: msg.role === 'user' ? `1px solid rgba(${activeRgb}, 0.2)` : '1px solid rgba(255, 255, 255, 0.05)',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px'
                  }}
                >
                  {msg.text && typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (
                    <span key={i} style={{ display: 'block', marginBottom: line.trim() === '' ? '8px' : '4px' }}>
                      {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j} style={{ fontWeight: '700', color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </span>
                  )) : msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <div 
                  style={{
                    padding: '10px 14px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderBottomLeftRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: 'pulseDot 1s infinite 0.1s' }}></span>
                  <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: 'pulseDot 1s infinite 0.2s' }}></span>
                  <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: 'pulseDot 1s infinite 0.3s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form 
            onSubmit={handleSendFloating}
            style={{
              padding: '12px 16px',
              display: 'flex',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              alignItems: 'center'
            }}
          >
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Mensagem para ${activeAgent.name}...`}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = activeAgentColor}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
            <button 
              type="submit" 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: activeAgentColor,
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = `0 0 10px rgba(${activeRgb}, 0.4)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const MainLayout = () => {
  return (
    <AgentChatProvider>
      <MainLayoutContent />
    </AgentChatProvider>
  );
};

export default MainLayout;
