import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Settings, Save, AlertCircle, Activity, MessageSquare } from 'lucide-react';
import './Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('prompts'); // 'prompts' ou 'metrics'
  const [prompts, setPrompts] = useState([]);
  const [tokenUsage, setTokenUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email !== 'maurocmj@gmail.com') {
      setError('Acesso Negado: Apenas o usuário maurocmj@gmail.com tem acesso a esta página.');
      setLoading(false);
      return;
    }
    setIsAuthorized(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promptsRes, tokensRes] = await Promise.all([
        supabase.from('agent_prompts').select('*').order('agent_role'),
        supabase.from('ai_token_usage').select('*, user:profiles(full_name)').order('created_at', { ascending: false })
      ]);
      
      if (promptsRes.error) throw promptsRes.error;
      if (tokensRes.error) throw tokensRes.error;

      setPrompts(promptsRes.data || []);
      setTokenUsage(tokensRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setError('Falha ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = (id, newText) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, system_prompt: newText } : p));
  };

  const savePrompt = async (id, newText) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase
        .from('agent_prompts')
        .update({ system_prompt: newText, updated_at: new Date() })
        .eq('id', id);

      if (error) {
        if (error.code === '42501') {
          throw new Error('Acesso Negado: Apenas Super Admins podem editar os prompts.');
        }
        throw error;
      }
      setSuccess('Prompt atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !isAuthorized) return <div className="admin-container">Carregando painel admin...</div>;

  // Calcula estatísticas
  const totalTokens = tokenUsage.reduce((acc, curr) => acc + curr.total_tokens, 0);
  const byFeature = tokenUsage.reduce((acc, curr) => {
    acc[curr.feature] = (acc[curr.feature] || 0) + curr.total_tokens;
    return acc;
  }, {});

  return (
    <div className="admin-container glass">
      <div className="admin-header">
        <div className="admin-icon-wrapper">
          <Settings size={32} />
        </div>
        <div className="admin-title-section">
          <h1>Super Admin</h1>
          <p>Gerenciamento Global e IA da Plataforma</p>
        </div>
      </div>

      {error && (
        <div className="alert-message alert-error">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="alert-message alert-success">
          <Save size={20} />
          <p>{success}</p>
        </div>
      )}

      {isAuthorized && (
        <>
          <div className="admin-tabs">
            <button
              onClick={() => setActiveTab('prompts')}
              className={`admin-tab-btn ${activeTab === 'prompts' ? 'active' : ''}`}
            >
              <MessageSquare size={18} />
              Agent Prompts
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`admin-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            >
              <Activity size={18} />
              Métricas de IA
            </button>
          </div>

          {loading ? (
            <div style={{color: 'var(--text-muted)'}}>Carregando dados...</div>
          ) : (
            <>
              {activeTab === 'prompts' && (
                <div>
                  {prompts.map((prompt) => (
                    <div key={prompt.id} className="admin-card glass">
                      <div className="prompt-card-header">
                        <div className="prompt-agent-name">
                          Agente: <span className="prompt-agent-highlight">{prompt.agent_role}</span>
                        </div>
                        <button 
                          onClick={() => savePrompt(prompt.id, prompt.system_prompt)}
                          disabled={saving}
                          className="admin-save-btn"
                        >
                          <Save size={18} />
                          {saving ? 'Salvando...' : 'Salvar Prompt'}
                        </button>
                      </div>
                      
                      <textarea
                        className="prompt-textarea"
                        value={prompt.system_prompt}
                        onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
                        placeholder="Insira as instruções do sistema aqui..."
                      />
                      <div className="prompt-footer">
                        Última atualização: {new Date(prompt.updated_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'metrics' && (
                <div>
                  <div className="metrics-grid">
                    <div className="admin-card glass metric-stat-card">
                      <div className="metric-stat-title">Tokens Consumidos (Global)</div>
                      <div className="metric-stat-value">{totalTokens.toLocaleString('pt-BR')}</div>
                    </div>
                    
                    <div className="admin-card glass">
                      <h3 style={{marginTop: 0, marginBottom: '1.5rem', fontWeight: 600}}>Consumo por Agente/Funcionalidade</h3>
                      <div className="feature-list">
                        {Object.entries(byFeature).sort((a,b) => b[1] - a[1]).map(([feature, tokens]) => (
                          <div key={feature} className="feature-item">
                            <span className="feature-name">{feature}</span>
                            <span className="feature-tokens">{tokens.toLocaleString('pt-BR')} <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>tkns</span></span>
                          </div>
                        ))}
                        {Object.keys(byFeature).length === 0 && <p style={{color: 'var(--text-muted)'}}>Nenhum consumo registrado ainda.</p>}
                      </div>
                    </div>
                  </div>

                  <div className="admin-card glass">
                    <h3 style={{marginTop: 0, marginBottom: '1.5rem', fontWeight: 600}}>Histórico de Chamadas (Logs)</h3>
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Data e Hora</th>
                            <th>Usuário</th>
                            <th>Funcionalidade / Agente</th>
                            <th style={{textAlign: 'right'}}>Tokens</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tokenUsage.slice(0, 50).map(log => (
                            <tr key={log.id}>
                              <td style={{whiteSpace: 'nowrap'}}>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                              <td>{log.user?.full_name || log.user_id}</td>
                              <td style={{fontFamily: 'monospace'}}>{log.feature}</td>
                              <td style={{textAlign: 'right', fontWeight: 600, color: '#00e5ff'}}>{log.total_tokens}</td>
                            </tr>
                          ))}
                          {tokenUsage.length === 0 && (
                            <tr>
                              <td colSpan="4" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>Nenhum log de consumo encontrado.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Admin;
