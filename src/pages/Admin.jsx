import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Settings, Save, AlertCircle } from 'lucide-react';

const Admin = () => {
  const [prompts, setPrompts] = useState([]);
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
    fetchPrompts();
  };

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_prompts')
        .select('*')
        .order('agent_role');
      
      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Erro ao buscar prompts:', error);
      setError('Falha ao carregar os prompts.');
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

  if (loading) return <div className="p-8 text-white">Carregando painel admin...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Super Admin</h1>
          <p className="text-zinc-400">Engenharia de Prompt Dinâmica (Multiagente)</p>
        </div>
      </div>

      {error && !isAuthorized && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {error && isAuthorized && (
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
                  {saving ? 'Salvando...' : 'Salvar Prompt'}
                </button>
              </div>
              
              <p className="text-sm text-zinc-500 mb-2">Instrução de Sistema (System Prompt):</p>
              <textarea
                className="w-full h-48 bg-black border border-zinc-800 rounded-xl p-4 text-zinc-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-y"
                value={prompt.system_prompt}
                onChange={(e) => handlePromptChange(prompt.id, e.target.value)}
              />
              <p className="text-xs text-zinc-600 mt-3 text-right">
                Última atualização: {new Date(prompt.updated_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
