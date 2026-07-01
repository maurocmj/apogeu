import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AgentChatContext = createContext(null);

const formatGlobalContext = ({ profile, goals, history, exams, workouts, habits, bodyMetrics }) => {
  let context = '';

  if (profile) {
    context += `[PERFIL] Nome: ${profile.full_name || 'Mauro'} | Nascimento: ${profile.birth_date || 'Não informado'} | Gênero: ${profile.gender || 'Não informado'}\n`;
  }

  if (goals && goals.length > 0) {
    context += `[OBJETIVOS ATIVOS]\n`;
    goals.forEach(g => {
      context += `- ${g.goal_type}: ${g.description || ''}\n`;
    });
  }

  if (history && history.baseline_data) {
    context += `[ANAMNESE/HISTÓRICO CLÍNICO] ${JSON.stringify(history.baseline_data)}\n`;
  }

  if (bodyMetrics && bodyMetrics.length > 0) {
    const bm = bodyMetrics[0];
    const dateStr = bm.recorded_at ? new Date(bm.recorded_at).toLocaleDateString('pt-BR') : 'Sem data';
    context += `[COMPOSIÇÃO CORPORAL RECENTE] Data: ${dateStr} | Peso: ${bm.weight || '--'} kg | Altura: ${bm.height || '--'} cm | Gordura Corporal: ${bm.body_fat_percentage || '--'}% | Massa Muscular: ${bm.muscle_mass || '--'} kg\n`;
  }

  if (exams && exams.length > 0) {
    context += `[HISTÓRICO DE EXAMES (Últimos 5)]\n`;
    exams.forEach(e => {
      const dateStr = e.collection_date ? new Date(e.collection_date).toLocaleDateString('pt-BR') : 'Sem data';
      const bioStr = e.biomarkers ? Object.entries(e.biomarkers)
        .map(([k, v]) => {
          const val = typeof v === 'object' && v !== null ? v.value : v;
          const unit = typeof v === 'object' && v !== null ? (v.unit || '') : '';
          return `${k.replace(/_/g, ' ').toUpperCase()}: ${val} ${unit}`;
        })
        .join(', ') : 'Sem marcadores';
      context += `- ${e.exam_type} (${dateStr}): [${bioStr}]\n`;
    });
  }

  if (workouts && workouts.length > 0) {
    context += `[TREINOS RECENTES (Últimos 10)]\n`;
    workouts.forEach(w => {
      const dateStr = w.event_date ? new Date(w.event_date).toLocaleDateString('pt-BR') : 'Sem data';
      const payload = w.payload || {};
      const sport = payload.sport || payload.type || 'Workout';
      const title = payload.title || payload.name || 'Atividade';
      const dist = payload.distance ? `${(payload.distance / 1000).toFixed(2)} km` : 'N/A';
      const duration = payload.moving_time ? `${Math.round(payload.moving_time / 60)} min` : 'N/A';
      const cal = payload.calories ? `${Math.round(payload.calories)} kcal` : 'N/A';
      context += `- ${dateStr} - ${sport}: "${title}" | Distância: ${dist} | Duração: ${duration} | Calorias: ${cal}\n`;
    });
  }

  if (habits && habits.length > 0) {
    context += `[HISTÓRICO DE MONITORAMENTO (Últimos 7 dias)]\n`;
    habits.forEach(h => {
      const m = h.metrics || {};
      const hrStr = m.heart_rate_avg ? `Frequência Cardíaca: Média ${m.heart_rate_avg} bpm (Mín: ${m.heart_rate_min}, Máx: ${m.heart_rate_max})` : 'Sem batimentos';
      context += `- ${h.date}: Sono: ${m.sleep_hours || 0}h (Qualidade: ${m.sleep_quality || 0}%) | Estresse: ${m.stress_level || 0}% | Humor: ${m.mood || 'N/A'} | ${hrStr}\n`;
    });
  }

  return context;
};

export const AgentChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState('apogeu');
  const [chatContext, setChatContext] = useState('');
  const [globalUserContext, setGlobalUserContext] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  
  // Persistent histories for each agent stored globally
  const [conversations, setConversations] = useState({
    apogeu: [{ role: 'assistant', text: 'Olá, Mauro! Sou o APOGEU IA, seu assistente geral. Como posso ajudar você hoje?' }],
    personal: [{ role: 'assistant', text: 'E aí, Mauro! Sou seu Personal Agent. Como está seu ritmo de treinos e sua recuperação hoje?' }],
    mind: [{ role: 'assistant', text: 'Olá, Mauro. Sou o Mind Agent. Vamos conversar sobre como melhorar sua qualidade de sono ou gerenciar seu nível de estresse?' }],
    nutri: [{ role: 'assistant', text: 'Olá, Mauro! Sou o Nutri Agent. Quer falar sobre seu plano alimentar, calorias ou sua hidratação de hoje?' }],
    bio: [{ role: 'assistant', text: 'Olá, Mauro. Sou o Bio Agent. Posso ajudar com suas medições corporais, composição física ou metas de evolução morfológica.' }],
    medical: [{ role: 'assistant', text: 'Olá, Mauro. Sou o Medical Agent. Tem alguma dúvida sobre seus exames clínicos, glicose, colesterol ou outros indicadores de saúde?' }]
  });

  const refreshGlobalUserContext = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setGlobalUserContext('');
        return;
      }
      setIsLoadingContext(true);
      const userId = session.user.id;

      // Parallel fetching from all tables
      const [
        profileRes,
        goalsRes,
        historyRes,
        examsRes,
        workoutsRes,
        habitsRes,
        bodyMetricsRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_goals').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('medical_history').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('medical_exams').select('*').eq('user_id', userId).order('collection_date', { ascending: false }).limit(5),
        supabase.from('health_events').select('*').eq('user_id', userId).eq('event_type', 'WORKOUT_COMPLETED').order('event_date', { ascending: false }).limit(10),
        supabase.from('daily_habits').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7),
        supabase.from('body_metrics').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(1)
      ]);

      const formatted = formatGlobalContext({
        profile: profileRes.data,
        goals: goalsRes.data,
        history: historyRes.data,
        exams: examsRes.data,
        workouts: workoutsRes.data,
        habits: habitsRes.data,
        bodyMetrics: bodyMetricsRes.data
      });

      setGlobalUserContext(formatted);
    } catch (err) {
      console.error("Erro ao carregar contexto global do usuário:", err);
    } finally {
      setIsLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    refreshGlobalUserContext();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        refreshGlobalUserContext();
      } else {
        setGlobalUserContext('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshGlobalUserContext]);

  const openAgentChat = (agentId, customMessage) => {
    if (agentId) {
      setActiveAgentId(agentId);
      
      if (customMessage) {
        setConversations(prev => {
          const history = prev[agentId] || [];
          const newHistory = [...history];
          
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
      openAgentChat,
      chatContext,
      setChatContext,
      globalUserContext,
      refreshGlobalUserContext,
      isLoadingContext
    }}>
      {children}
    </AgentChatContext.Provider>
  );
};

export const useAgentChat = () => useContext(AgentChatContext);
