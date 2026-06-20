import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Settings, Save, AlertCircle, Activity, MessageSquare } from 'lucide-react';

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
        supabase.from('ai_token_usage').select('*, user:profiles(name, email)').order('created_at', { ascending: false })
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

  if (loading && !isAuthorized) return <div className="p-8 text-white">Carregando painel admin...</div>;

  // Calcula estatísticas
  const totalTokens = tokenUsage.reduce((acc, curr) => acc + curr.total_tokens, 0);
  const byFeature = tokenUsage.reduce((acc, curr) => {
    acc[curr.feature] = (acc[curr.feature] || 0) + curr.total_tokens;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Super Admin</h1>
          <p className="text-zinc-400">Gerenciamento do Sistema</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400">
          <Save size={20} />
          <p>{success}</p>
        </div>
      )}

      {isAuthorized && (
        <>
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'prompts' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <MessageSquare size={18} />
              Agent Prompts
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'metrics' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Activity size={18} />
              Métricas de IA
            </button>
          </div>

          {loading ? (
            <div className="text-zinc-400">Carregando dados...</div>
          ) : (
            <>
              {/* Tab Prompts */}
              {activeTab === 'prompts' && (
                <div className="space-y-6">
                  {prompts.map((prompt) => (
                    <div key={prompt.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                          Agente: <span className="text-red-400">{prompt.agent_role}</span>
                        </h2>
                        <button 
                          onClick={() => savePrompt(prompt.id, prompt.system_prompt)}
                          disabled={saving}
                          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Save size={18} />
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                      
                      <p className="text-sm text-zinc-500 mb-2">Instrução de Sistema (System Prompt):</p>
                      <textarea
                        className="w-full h-48 bg-black border border-zinc-800 rounded-xl p-4 text-zinc-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-y font-mono text-sm"
                        value={prompt.system_prompt}
                        onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
                      />
                      <p className="text-xs text-zinc-600 mt-3 text-right">
                        Última atualização: {new Date(prompt.updated_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Métricas */}
              {activeTab === 'metrics' && (
                <div className="space-y-6">
                  {/* Visão Geral */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                      <h3 className="text-zinc-400 text-sm mb-1">Total de Tokens Consumidos</h3>
                      <p className="text-3xl font-bold text-white">{totalTokens.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Por Feature */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                    <h3 className="text-white text-lg font-semibold mb-4">Consumo por Funcionalidade</h3>
                    <div className="space-y-3">
                      {Object.entries(byFeature).sort((a,b) => b[1] - a[1]).map(([feature, tokens]) => (
                        <div key={feature} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-zinc-800/50">
                          <span className="text-zinc-300 font-mono text-sm">{feature}</span>
                          <span className="text-red-400 font-semibold">{tokens.toLocaleString('pt-BR')} tokens</span>
                        </div>
                      ))}
                      {Object.keys(byFeature).length === 0 && <p className="text-zinc-500 text-sm">Nenhum consumo registrado ainda.</p>}
                    </div>
                  </div>

                  {/* Log Detalhado */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl overflow-hidden">
                    <h3 className="text-white text-lg font-semibold mb-4">Log Detalhado (Últimos Registros)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-black text-zinc-500">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg font-medium">Data/Hora</th>
                            <th className="px-4 py-3 font-medium">Usuário</th>
                            <th className="px-4 py-3 font-medium">Feature</th>
                            <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Tokens</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {tokenUsage.slice(0, 50).map(log => (
                            <tr key={log.id} className="hover:bg-zinc-800/20">
                              <td className="px-4 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-3 truncate max-w-[150px]">{log.user?.name || log.user?.email || log.user_id}</td>
                              <td className="px-4 py-3 font-mono text-xs">{log.feature}</td>
                              <td className="px-4 py-3 text-right font-semibold text-white">{log.total_tokens}</td>
                            </tr>
                          ))}
                          {tokenUsage.length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-4 py-8 text-center text-zinc-500">Nenhum log encontrado.</td>
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
