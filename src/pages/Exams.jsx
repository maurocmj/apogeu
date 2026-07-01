import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Upload, FileText, Search, ExternalLink, ShieldAlert, Target, Loader2, Save, Info, Download, ChevronDown, ChevronUp, Activity, Heart, Calendar, AlertTriangle, Trash2, RefreshCw, TrendingUp } from 'lucide-react';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import AgentBubbleCard from '../components/AgentBubbleCard';
import ActionPlanCard from '../components/ActionPlanCard';
import HealthRadarChart from '../components/HealthRadarChart';
import HealthScoreTimelineChart from '../components/HealthScoreTimelineChart';
import { useAgentChat } from '../context/AgentChatContext';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.replace(/\0/g, '').replace(/\\u0000/g, '');
  } catch (err) {
    console.error("Erro lendo PDF local:", err);
    throw new Error("Falha ao ler o PDF localmente.");
  }
};

const Exams = () => {
  const { setChatContext, refreshGlobalUserContext } = useAgentChat();
  const [uploading, setUploading] = useState(false);
  const [exams, setExams] = useState([]);
  const [userId, setUserId] = useState(null);
  const [biomarkerDict, setBiomarkerDict] = useState({});
  const [loadingInfo, setLoadingInfo] = useState({});
  const [tooltip, setTooltip] = useState({ isOpen: false, key: '', content: '', x: 0, y: 0 });
  const [expandedExams, setExpandedExams] = useState({});
  const [evolutionSummary, setEvolutionSummary] = useState('');
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [chartTooltip, setChartTooltip] = useState({ isOpen: false, key: '', history: [], x: 0, y: 0 });
  const [userGoal, setUserGoal] = useState('Longevidade');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [bioSearch, setBioSearch] = useState('');
  const [bioPage, setBioPage] = useState(1);

  useEffect(() => {
    if (exams && exams.length > 0) {
      const processed = exams.filter(e => e.status === 'processed');
      if (processed.length > 0) {
        const examContext = processed.map(e => 
          `Exame: ${e.exam_type} (Data: ${new Date(e.collection_date).toLocaleDateString('pt-BR')}). Biomarcadores: ${JSON.stringify(e.biomarkers)}`
        ).join('\n\n');
        setChatContext(examContext);
      } else {
        setChatContext('Nenhum exame clínico processado ainda.');
      }
    } else {
      setChatContext('Nenhum exame cadastrado no perfil do usuário.');
    }
    
    refreshGlobalUserContext();
    
    return () => {
      setChatContext('');
    };
  }, [exams, setChatContext, refreshGlobalUserContext]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        fetchExams(session.user.id);
        // Carrega análise salva imediatamente (sem esperar API)
        const cached = localStorage.getItem(`evolutionSummary_${session.user.id}`);
        if (cached) setEvolutionSummary(cached);

        // Fetch User Goal
        supabase.from('user_goals').select('goal_type').eq('user_id', session.user.id).eq('is_active', true).single()
          .then(({ data }) => {
            if (data && data.goal_type) {
              const types = data.goal_type.split(',').map(s => s.trim());
              if (types.length > 0) setUserGoal(types[0]);
            }
          });
      }
    });

    supabase.from('biomarkers_dictionary').select('key, description').then(({data}) => {
      if (data) {
        const dict = {};
        data.forEach(item => dict[item.key] = item.description);
        setBiomarkerDict(dict);
      }
    });
  }, []);

  // Função reutilizável de processamento via IA (Parser + Medical Agent)
  // DEVE ficar ANTES de fetchExams para evitar erro de referência
  const processExam = async (examId, reportContent, examTitle = 'Laudo Médico') => {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

    // 1. Busca Prompt do Parser
    const { data: promptData } = await supabase.from('agent_prompts').select('system_prompt').eq('agent_role', 'ExamParser').single();
    const parserPrompt = promptData?.system_prompt || "Extraia os dados em JSON contendo exam_title, laboratory_name, collection_date e biomarkers.";

    // 2. Chama OpenAI (Parser)
    const parserRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: parserPrompt },
          { role: "user", content: `Laudo Médico:\n${reportContent}\n\nExtraia os resultados num formato JSON válido. Apenas o JSON.` }
        ],
        response_format: { type: "json_object" }
      })
    });
    const parserJson = await parserRes.json();
    if (parserJson.usage && userId) {
      supabase.from('ai_token_usage').insert({
        user_id: userId, feature: 'exam_parser', model: 'gpt-4o-mini',
        prompt_tokens: parserJson.usage.prompt_tokens, completion_tokens: parserJson.usage.completion_tokens, total_tokens: parserJson.usage.total_tokens
      }).then();
    }
    const parsedData = JSON.parse(parserJson.choices[0].message.content || "{}");

    // 3. Atualiza Exame com Biomarcadores + data real do exame
    const parsedDate = parsedData.collection_date
      ? (() => {
          // Aceita formatos: YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY
          let d = parsedData.collection_date.trim();
          // Converte DD/MM/YYYY ou DD/MM/YY → YYYY-MM-DD
          const brMatch = d.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
          if (brMatch) {
            const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
            d = `${year}-${brMatch[2]}-${brMatch[1]}`;
          }
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? null : d;
        })()
      : null;

    await supabase.from('medical_exams').update({ 
      biomarkers: parsedData.biomarkers || {}, 
      laboratory_name: parsedData.laboratory_name || null,
      exam_type: parsedData.exam_title || examTitle,
      ...(parsedDate && { collection_date: parsedDate }),
      status: 'processed' 
    }).eq('id', examId);


    // 4. Busca Prompt do Medical Agent e Anamnese
    const { data: medPromptData } = await supabase.from('agent_prompts').select('system_prompt').eq('agent_role', 'Medical').single();
    const { data: medHistory } = await supabase.from('medical_history').select('*').eq('user_id', userId).single();
    const { data: goalData } = await supabase.from('user_goals').select('*').eq('user_id', userId).eq('is_active', true).single();
    
    const agentPrompt = medPromptData?.system_prompt || "Você é um agente médico.";
    const promptContext = `
      Objetivo: ${goalData?.goal_type || 'Geral'} - ${goalData?.description || ''}
      Anamnese: ${JSON.stringify(medHistory?.baseline_data || {})}
      Biomarcadores: ${JSON.stringify(parsedData.biomarkers || {})}
      Analise os biomarcadores e gere um JSON com "chat_message", "action_plan" (array de strings) e "delegations" (array de objetos com agent_role e instructions).
    `;

    // 5. Chama OpenAI (Medical Agent)
    const agentRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: agentPrompt },
          { role: "user", content: promptContext }
        ],
        response_format: { type: "json_object" }
      })
    });
    const agentJson = await agentRes.json();
    if (agentJson.usage && userId) {
      supabase.from('ai_token_usage').insert({
        user_id: userId, feature: 'medical_agent', model: 'gpt-4o-mini',
        prompt_tokens: agentJson.usage.prompt_tokens, completion_tokens: agentJson.usage.completion_tokens, total_tokens: agentJson.usage.total_tokens
      }).then();
    }
    const insights = JSON.parse(agentJson.choices[0].message.content || "{}");

    // 6. Atualiza Exame com Insights
    await supabase.from('medical_exams').update({ ai_insights: insights }).eq('id', examId);

    // 7. Delegações
    if (insights.delegations && Array.isArray(insights.delegations)) {
      for (const delegation of insights.delegations) {
        await supabase.from('agent_insights').insert({
          user_id: userId,
          agent_role: delegation.agent_role,
          context: 'medical_exam_crossover',
          content: delegation.instructions,
          status: 'pending'
        });
      }
    }
  };

  const fetchExams = async (uid) => {
    const { data } = await supabase
      .from('medical_exams')
      .select('*')
      .eq('user_id', uid)
      .order('collection_date', { ascending: false });
    if (data) {
      setExams(data);
      if (data.length > 0) {
        setExpandedExams({ [data[0].id]: true });
      }
      // Auto-reprocessa todos os exames travados em 'processing'
      const stuck = data.filter(e => e.status === 'processing' && e.medical_report);
      for (const exam of stuck) {
        processExam(exam.id, exam.medical_report, exam.exam_type)
          .then(() => fetchExams(uid))
          .catch(err => console.error(`Erro ao reprocessar exame ${exam.id}:`, err));
      }
    }
  };

  // Gera análise de evolução clínica — só quando um novo exame é adicionado
  useEffect(() => {
    const processedExams = exams.filter(e => e.status === 'processed' && e.biomarkers);
    if (processedExams.length === 0) return;

    const generateEvolution = async () => {
      setLoadingEvolution(true);
      try {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        const allExamsSorted = [...processedExams].reverse();
        const summary = allExamsSorted
          .map(e => `[${new Date(e.collection_date).toLocaleDateString('pt-BR')}] ${e.exam_type}: ${JSON.stringify(e.biomarkers).slice(0, 300)}`)
          .join('\n');

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Você é um médico especialista em longevidade. Analise o histórico COMPLETO de exames do paciente (do mais antigo ao mais recente) e escreva EXATAMENTE 3 frases sobre a evolução clínica. Regras obrigatórias: (1) use linguagem direta e acessível, (2) mencione tendências relevantes entre os exames, (3) seja objetivo. Retorne apenas as 3 frases, sem enumeração, sem markdown, sem quebras de linha extras.' },
              { role: 'user', content: `Histórico completo de exames:\n${summary}` }
            ],
            max_tokens: 180
          })
        });
        const data = await res.json();
        if (data.usage && userId) {
          supabase.from('ai_token_usage').insert({
            user_id: userId, feature: 'evolution_analysis', model: 'gpt-4o-mini',
            prompt_tokens: data.usage.prompt_tokens, completion_tokens: data.usage.completion_tokens, total_tokens: data.usage.total_tokens
          }).then();
        }
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          setEvolutionSummary(text);
          // Persiste para aparecer sempre ao abrir o app
          if (userId) localStorage.setItem(`evolutionSummary_${userId}`, text);
        }
      } catch (err) {
        console.error('Erro ao gerar análise de evolução:', err);
      } finally {
        setLoadingEvolution(false);
      }
    };

    generateEvolution();
  }, [exams.length]); // Roda toda vez que um novo exame é adicionado

  const handleDelete = async (examId) => {
    if (!window.confirm("Tem certeza que deseja excluir este exame?")) return;
    
    // Deleta do DB
    const { error } = await supabase.from('medical_exams').delete().eq('id', examId);
    if (!error) {
      setExams(exams.filter(e => e.id !== examId));
    } else {
      alert("Erro ao excluir o exame: " + error.message);
    }
  };

  const handleMouseEnter = async (e, key) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    setTooltip({ isOpen: true, key, content: biomarkerDict[key] || 'Buscando informações clínicas...', x, y });
    
    if (!biomarkerDict[key] && !loadingInfo[key]) {
      setLoadingInfo(prev => ({ ...prev, [key]: true }));
      try {
        const res = await supabase.functions.invoke('biomarker-info-service', {
          body: { biomarkerKey: key }
        });
        if (res.error) throw res.error;
        
        const desc = res.data.description;
        setBiomarkerDict(prev => ({ ...prev, [key]: desc }));
        setTooltip(prev => prev.key === key ? { ...prev, content: desc } : prev);
      } catch (err) {
        setTooltip(prev => prev.key === key ? { ...prev, content: "Erro ao carregar." } : prev);
      } finally {
        setLoadingInfo(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ isOpen: false, key: '', content: '', x: 0, y: 0 });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !userId) return;
    e.target.value = '';
    setUploading(true);

    const duplicates = [];
    const added = [];

    await Promise.all(files.map(async (f) => {
      try {
        const exam = await uploadAndProcessFile(f);
        added.push(exam);
      } catch (err) {
        if (err.message?.includes('já foi importado')) {
          duplicates.push(f.name);
        } else {
          console.error('Erro no upload:', err);
          alert('Erro ao enviar exame: ' + (err.message || JSON.stringify(err)));
        }
      }
    }));

    if (added.length > 0) {
      setExams(prev => [...added, ...prev]);
    }
    if (duplicates.length > 0) {
      alert(`⚠️ Os seguintes exames já existem e foram ignorados:\n\n${duplicates.map(n => `• ${n}`).join('\n')}`);
    }

    setUploading(false);
  };

  // Gera fingerprint do texto extraído (início + fim) para detectar duplicatas
  const generateFingerprint = (text) => {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, 300) + '||' + cleaned.slice(-100);
  };

  // Processa um único arquivo e retorna o exame criado
  const uploadAndProcessFile = async (file) => {
    let reportContent = '';
    let filePublicUrl = null;
    const examTitle = file.name || 'Laudo Médico';

    if (file.type !== 'application/pdf') {
      throw new Error(`${file.name} não é um PDF válido.`);
    }

    reportContent = await extractTextFromPDF(file);

    // ── Detecção de duplicatas ──
    const fingerprint = generateFingerprint(reportContent);
    const isDuplicate = exams.some(e =>
      e.medical_report && generateFingerprint(e.medical_report) === fingerprint
    );
    if (isDuplicate) {
      throw new Error(`⚠️ "${file.name}" já foi importado anteriormente. Importação ignorada.`);
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('medical_exams_files').upload(filePath, file);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('medical_exams_files').getPublicUrl(filePath);
      filePublicUrl = publicUrl;
    }

    const { data: newExam, error: dbError } = await supabase
      .from('medical_exams')
      .insert({
        user_id: userId,
        exam_type: examTitle,
        document_url: filePublicUrl,
        medical_report: reportContent,
        collection_date: new Date().toISOString(),
        status: 'processing'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Processa IA em background (não bloqueia os outros arquivos)
    processExam(newExam.id, reportContent, examTitle)
      .then(() => fetchExams(userId))
      .catch(err => console.error(`Erro ao processar ${file.name}:`, err));

    return newExam;
  };


  // processExam já foi declarado acima (antes de fetchExams)

  // Reprocessa um exame travado usando o medical_report já salvo no banco
  const handleReprocess = async (exam) => {
    if (!exam.medical_report) {
      alert('Este exame não possui o texto do laudo salvo. Não é possível reprocessar.');
      return;
    }
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: 'processing' } : e));
    try {
      await processExam(exam.id, exam.medical_report, exam.exam_type);
      fetchExams(userId);
    } catch (e) {
      console.error('Erro ao reprocessar:', e);
      alert('Erro ao reprocessar o exame: ' + (e.message || JSON.stringify(e)));
      fetchExams(userId);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excelente': return 'rgba(0, 229, 255, 0.8)';
      case 'normal': return 'rgba(16, 185, 129, 0.8)';
      case 'atencao': return 'rgba(245, 158, 11, 0.8)';
      case 'critico': return 'rgba(239, 68, 68, 0.8)';
      default: return 'rgba(16, 185, 129, 0.8)';
    }
  };

  // Coleta histórico de um biomarcador em todos os exames
  const getBiomarkerHistory = (key) => {
    return exams
      .filter(e => e.biomarkers?.[key] && e.status === 'processed')
      .sort((a, b) => new Date(a.collection_date) - new Date(b.collection_date))
      .map(e => {
        const val = e.biomarkers[key];
        const valObj = typeof val === 'object' ? val : { value: val, status: 'normal' };
        const numMatch = String(valObj.value).match(/[\d.]+/);
        return {
          date: new Date(e.collection_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          rawValue: String(valObj.value),
          numValue: numMatch ? parseFloat(numMatch[0]) : null,
          status: valObj.status
        };
      })
      .filter(p => p.numValue !== null);
  };

  const handleChartMouseEnter = (e, key) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setChartTooltip({
      isOpen: true, key,
      history: getBiomarkerHistory(key),
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };
  const handleChartMouseLeave = () => setChartTooltip(prev => ({ ...prev, isOpen: false }));


  const toggleExam = (id) => setExpandedExams(prev => ({ ...prev, [id]: !prev[id] }));

  const latestProcessedExam = exams.find(e => e.status === 'processed' && e.ai_insights);
  const insights = latestProcessedExam?.ai_insights;
  const initialMessage = insights?.chat_message || "Envie um laudo de exame para que eu possa cruzar os dados com seu Perfil e Genética. Seu Plano de Saúde surgirá aqui.";
  const actionPlanItems = insights?.action_plan || [];

  const lastExamDate = latestProcessedExam ? new Date(latestProcessedExam.collection_date).toLocaleDateString('pt-BR') : 'N/A';
  let totalBiomarkers = 0;
  exams.forEach(ex => {
    if (ex.biomarkers) {
      totalBiomarkers += Object.keys(ex.biomarkers).length;
    }
  });

  const examContext = exams.map(e => `Exame: ${e.exam_type} (Data: ${new Date(e.collection_date).toLocaleDateString('pt-BR')}). Biomarcadores: ${JSON.stringify(e.biomarkers)}`).join('\n\n');

  return (
    <div style={{ padding: '0', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── LINHA 1: 3 cards lado a lado ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', alignItems: 'stretch' }}>

        {/* Card 1: Visão Geral Clínica (Radar) */}
        <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Visão Geral Clínica</h3>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Mapa de sistemas</p>
            </div>
            <span className="badge">Atualizado {lastExamDate !== 'N/A' ? lastExamDate : 'hoje'}</span>
          </div>
          <div className="radar-chart-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
            <div style={{ width: '100%', maxWidth: '380px' }}>
              <HealthRadarChart exams={exams} />
            </div>
          </div>
          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(0,229,255,0.5)' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Checkup</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{lastExamDate}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(16,185,129,0.5)' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Indicadores</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{totalBiomarkers}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(245,158,11,0.5)' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Atenção</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Metabólico</span>
            </div>
          </div>
        </div>

        {/* Card 2: Histórico de Score */}
        <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Histórico de Score Clínico</h3>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Evolução do Score Geral e Sistemas</p>
          </div>
          <div style={{ flex: 1 }}>
            <HealthScoreTimelineChart exams={exams} />
          </div>

          {/* Análise de Evolução Clínica — gerada pela IA */}
          <div style={{
            marginTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '16px'
          }}>
            {loadingEvolution ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Loader2 size={13} className="animate-spin" color="var(--primary)" />
                <span style={{ fontSize: '12px' }}>Analisando evolução...</span>
              </div>
            ) : evolutionSummary ? (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px',
                    color: 'var(--primary)', fontWeight: '700'
                  }}>Análise do Agente</span>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)',
                    animation: 'pulse 2s infinite'
                  }} />
                </div>
                <p style={{
                  margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)',
                  lineHeight: '1.65', fontStyle: 'italic'
                }}>"{evolutionSummary}"</p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Importe exames para gerar a análise de evolução.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: LAUDO ATUAL + Plano de Ação */}
        <div className="glass" style={{ borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                <Heart size={16} color="#10b981" /> Laudo Atual
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Análise clínica do Medical Agent</p>
            </div>
          </div>

          {/* Protocolo Clínico — abre modal ao clicar */}
          {actionPlanItems.length > 0 && (
            <ActionPlanModal items={actionPlanItems} />
          )}

          {/* Chat */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <AgentBubbleCard
              agentId="medical"
              agentName="Medical Agent"
              icon={Heart}
              agentColor="#10b981"
              message={initialMessage}
            />
          </div>
        </div>
      </div>

      <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp color="var(--primary)" size={20} /> Evolução de Biomarcadores
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Focados no seu objetivo atual: <strong style={{ color: '#fff' }}>{userGoal}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar biomarcador..." 
              value={bioSearch} 
              onChange={e => { setBioSearch(e.target.value); setBioPage(1); }} 
              style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '12px', width: '160px' }} 
            />
          </div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Biomarcador</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Curva</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Histórico de Resultados</th>
                <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Relevância</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const getBiomarkerEvolution = (examsList, goal) => {
                  if (!examsList || examsList.length === 0) return [];
                  
                  const priorities = {
                    'Emagrecimento': ['glicose', 'insulina', 'homa', 'colesterol', 'hdl', 'ldl', 'triglicerideos', 'tsh', 't4'],
                    'Hipertrofia': ['testosterona', 'shbg', 'cpk', 'creatinina', 'ferritina', 'vitamina_d'],
                    'Longevidade': ['pcr', 'hdl', 'ldl', 'triglicerideos', 'glicada', 'b12', 'dhea'],
                    'Performance': ['ferritina', 'hemoglobina', 'cpk', 'testosterona', 'cortisol'],
                    'Recuperacao': ['pcr', 'ck', 'leucocitos']
                  };
                  
                  const targetList = priorities[goal] || priorities['Longevidade'];
                  
                  const sortedExams = [...examsList]
                    .filter(e => e.status === 'processed' && e.biomarkers)
                    .sort((a, b) => new Date(a.collection_date) - new Date(b.collection_date));
                  
                  const map = {};
                  
                  sortedExams.forEach(exam => {
                    Object.entries(exam.biomarkers).forEach(([key, val]) => {
                      const lowerKey = key.toLowerCase();
                      
                      let foundKey = Object.keys(map).find(k => k.toLowerCase() === lowerKey);
                      if (!foundKey) {
                        foundKey = key;
                        map[foundKey] = {
                          name: key,
                          history: [],
                          isPriority: targetList.some(p => lowerKey.includes(p))
                        };
                      }
                      
                      const valueStr = typeof val === 'object' ? val.value : val;
                      const status = typeof val === 'object' ? val.status : 'normal';
                      const dateStr = new Date(exam.collection_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                      
                      map[foundKey].history.push({ value: valueStr, status: status, date: dateStr, examId: exam.id });
                    });
                  });
                  
                  return Object.values(map).sort((a, b) => {
                    if (a.isPriority && !b.isPriority) return -1;
                    if (!a.isPriority && b.isPriority) return 1;
                    return a.name.localeCompare(b.name);
                  });
                };

                let bioList = getBiomarkerEvolution(exams, userGoal);
                
                if (bioSearch) {
                  bioList = bioList.filter(b => b.name.toLowerCase().includes(bioSearch.toLowerCase()));
                }
                
                const totalPages = Math.ceil(bioList.length / 8);
                const startIndex = (bioPage - 1) * 8;
                const pagedList = bioList.slice(startIndex, startIndex + 8);

                if (bioList.length === 0) {
                  return (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum biomarcador encontrado.</td>
                    </tr>
                  );
                }

                return pagedList.map((bio, idx) => {
                  const sparklineData = bio.history.map(h => {
                    const numMatch = String(h.value).match(/[\d.]+/);
                    return { date: h.date, num: numMatch ? parseFloat(numMatch[0]) : 0 };
                  });
                  const hasData = sparklineData.some(d => d.num > 0);

                  return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: bio.isPriority ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '500', color: bio.isPriority ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {bio.name}
                        <div onMouseEnter={(e) => handleMouseEnter(e, bio.name)} onMouseLeave={handleMouseLeave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                          {loadingInfo[bio.name] ? (
                            <Loader2 size={12} className="animate-spin" color="var(--primary)" />
                          ) : (
                            <Info size={12} color="var(--text-muted)" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      {hasData && bio.history.length > 1 ? (
                        <div style={{ width: '60px', height: '24px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 4px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData}>
                              <YAxis domain={['dataMin', 'dataMax']} hide />
                              <Line type="monotone" dataKey="num" stroke={bio.isPriority ? "var(--primary)" : "#64748b"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {bio.history.map((h, i) => {
                          let color = 'var(--text-muted)';
                          let bg = 'rgba(255,255,255,0.05)';
                          if (h.status === 'attention' || h.status === 'high') {
                            color = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.15)';
                          } else if (h.status === 'critical') {
                            color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.15)';
                          } else if (h.status === 'normal') {
                            color = '#10b981'; bg = 'rgba(16, 185, 129, 0.15)';
                          }
                          
                          return (
                            <React.Fragment key={i}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px', borderRadius: '6px', background: bg, border: `1px solid ${bg.replace('0.15', '0.3')}` }}>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>{h.date}</span>
                                <strong style={{ color: color, fontSize: '12px' }}>{h.value}</strong>
                              </div>
                              {i < bio.history.length - 1 && <span style={{ color: 'rgba(255,255,255,0.1)' }}>➔</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {bio.isPriority ? (
                        <span style={{ fontSize: '10px', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', border: '1px solid rgba(0,229,255,0.3)' }}>
                          ALVO DO OBJETIVO
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Padrão</span>
                      )}
                    </td>
                  </tr>
                );
                })
              })()}
            </tbody>
          </table>
        </div>
        {/* Render Paginação if needed, outside the IIFE */}
        {(() => {
          let bioList = [];
          if (exams && exams.length > 0) {
            // Recalculate just length for pagination
            const getBiomarkerEvolution = (examsList, goal) => {
              const targetList = ['glicose'];
              const map = {};
              examsList.filter(e => e.status === 'processed' && e.biomarkers).forEach(exam => {
                Object.keys(exam.biomarkers).forEach(key => map[key] = true);
              });
              return Object.keys(map).map(k => ({name: k}));
            };
            bioList = getBiomarkerEvolution(exams, userGoal);
            if (bioSearch) bioList = bioList.filter(b => b.name.toLowerCase().includes(bioSearch.toLowerCase()));
          }
          const totalPages = Math.ceil(bioList.length / 8);
          if (totalPages > 1) {
            return (
              <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={() => setBioPage(p => Math.max(1, p - 1))} 
                  disabled={bioPage === 1}
                  style={{ background: 'transparent', border: 'none', color: bioPage === 1 ? 'var(--text-muted)' : '#fff', cursor: bioPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{bioPage} de {totalPages}</span>
                <button 
                  onClick={() => setBioPage(p => Math.min(totalPages, p + 1))} 
                  disabled={bioPage === totalPages}
                  style={{ background: 'transparent', border: 'none', color: bioPage === totalPages ? 'var(--text-muted)' : '#fff', cursor: bioPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  Próximo
                </button>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* ── LINHA 3: Tabela de Exames (Colapsável) ── */}
      <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity color="var(--primary)" size={20} /> Histórico de Exames Cadastrados
            </h3>
            <button 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isHistoryExpanded ? 'Ocultar' : `Ver Exames (${exams.length})`}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              height: '36px', padding: '0 18px',
              background: uploading ? 'rgba(255,255,255,0.05)' : 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer',
              color: uploading ? 'var(--text-muted)' : 'var(--primary)',
              fontWeight: '600', fontSize: '13px', transition: 'all 0.25s ease',
              pointerEvents: uploading ? 'none' : 'auto'
            }}>
              <input
                type="file"
                accept=".pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Processando...</>
                : <><Upload size={14} /> Enviar Exame</>}
            </label>
          </div>
        </div>
        {isHistoryExpanded && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Exame</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Data</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Laboratório</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum laudo cadastrado ainda.</td>
                  </tr>
                )}
              {exams.map(exam => (
                <React.Fragment key={exam.id}>
                  <tr
                    onClick={() => toggleExam(exam.id)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: expandedExams[exam.id] ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.3s ease', cursor: 'pointer' }}
                    className="hover-glow"
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: 'white', fontSize: '13px' }}>{exam.exam_type}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(exam.collection_date).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{exam.laboratory_name && exam.laboratory_name !== 'null' ? exam.laboratory_name : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {exam.status === 'processing' ? (
                        <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Loader2 className="animate-spin" size={12} /> Lendo
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '4px' }}>Extraído</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                        {exam.document_url && (
                          <a href={exam.document_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Baixar Original">
                            <Download size={18} color="var(--primary)" />
                          </a>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Excluir Exame">
                          <Trash2 size={18} color="#ef4444" />
                        </button>
                        {expandedExams[exam.id] ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                      </div>
                    </td>
                  </tr>
                  {expandedExams[exam.id] && (
                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <td colSpan={5} style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {exam.ai_insights?.chat_message && (
                          <div style={{ padding: '16px', background: 'rgba(245,158,11,0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginBottom: '16px' }}>
                            <div style={{ color: 'white', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                              {exam.ai_insights.chat_message.split('\n').map((line, i) => (
                                <span key={i} style={{ display: 'block', marginBottom: line.trim() === '' ? '8px' : '4px' }}>
                                  {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return <strong key={j} style={{ color: 'white', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
                                    }
                                    return <span key={j} style={{ color: 'var(--text-muted)' }}>{part}</span>;
                                  })}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {exam.biomarkers && Object.keys(exam.biomarkers).length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                            {Object.entries(exam.biomarkers).map(([key, value]) => {
                              const valObj = typeof value === 'object' ? value : { value, status: 'normal' };
                              const borderColor = getStatusColor(valObj.status);
                              return (
                                <div key={key} style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '6px', border: `1px solid ${borderColor}`, transition: 'all 0.2s ease' }} className="hover-glow">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px', lineHeight: '1.2' }}>{key.replace(/_/g, ' ')}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '4px' }}>
                                      {/* Ícone gráfico de evolução */}
                                      <div
                                        onMouseEnter={(e) => handleChartMouseEnter(e, key)}
                                        onMouseLeave={handleChartMouseLeave}
                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                        title="Evolução ao longo do tempo"
                                      >
                                        <TrendingUp size={12} color="var(--primary)" style={{ opacity: 0.7 }} />
                                      </div>
                                      {/* Ícone info */}
                                      <div onMouseEnter={(e) => handleMouseEnter(e, key)} onMouseLeave={handleMouseLeave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                                        {loadingInfo[key] ? <Loader2 size={12} className="animate-spin" color="var(--primary)" /> : <Info size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />}
                                      </div>
                                    </div>
                                  </div>
                                  <strong style={{ fontSize: '14px', color: 'white' }}>{String(valObj.value)}</strong>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tooltip Info */}
      {tooltip.isOpen && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 10, transform: 'translate(-50%, -100%)',
          backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,229,255,0.3)', padding: '16px', borderRadius: '12px',
          width: 'max-content', maxWidth: '300px', color: 'white', fontSize: '14px', zIndex: 9999,
          pointerEvents: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Info color="var(--primary)" size={16} />
            <strong style={{ color: 'var(--primary)' }}>{tooltip.key.replace(/_/g, ' ').toUpperCase()}</strong>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>{tooltip.content}</p>
        </div>
      )}

      {/* Tooltip Chart — evolução do biomarcador */}
      {chartTooltip.isOpen && (() => {
        const { key, history, x, y } = chartTooltip;
        const hasData = history.length >= 2;
        const values = hasData ? history.map(d => d.numValue) : [];
        const min = hasData ? Math.min(...values) : 0;
        const max = hasData ? Math.max(...values) : 1;
        const range = max - min || 1;
        const W = 220, H = 64, pad = 10;
        const pts = hasData ? history.map((d, i) => ({
          x: pad + (i / (history.length - 1)) * (W - 2 * pad),
          y: H - pad - ((d.numValue - min) / range) * (H - 2 * pad)
        })) : [];
        const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <div style={{
            position: 'fixed', left: x, top: y - 10, transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgba(9,10,15,0.97)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,229,255,0.3)', padding: '14px 16px', borderRadius: '12px',
            width: '240px', zIndex: 9999, pointerEvents: 'none',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <TrendingUp size={13} color="var(--primary)" />
              <strong style={{ color: 'var(--primary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {key.replace(/_/g, ' ')}
              </strong>
            </div>
            {!hasData ? (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
                {history.length === 1 ? 'Apenas 1 registro — sem histórico ainda.' : 'Sem registros numéricos.'}
              </p>
            ) : (
              <>
                <svg width={W} height={H} style={{ display: 'block' }}>
                  {/* Área abaixo da linha */}
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${pathD} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`} fill="url(#sparkGrad)" />
                  <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" />
                  {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={getStatusColor(history[i].status)} stroke="rgba(9,10,15,0.8)" strokeWidth="1" />
                  ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  {history.map((d, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: getStatusColor(d.status), fontWeight: '600' }}>{d.rawValue}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{d.date}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};

const ActionPlanModal = ({ items }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      {/* Botão de trigger */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#10b981', fontWeight: '600', fontSize: '12px',
          transition: 'background 0.2s ease'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            background: '#10b981', color: '#0a0f1e', borderRadius: '50%',
            width: '18px', height: '18px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '10px', fontWeight: '700'
          }}>{items.length}</span>
          Protocolo Clínico Ativo
        </span>
        <span style={{ fontSize: '11px', opacity: 0.8 }}>Ver plano ↗</span>
      </button>

      {/* Modal via Portal — monta direto no body, acima de tudo */}
      {isOpen && ReactDOM.createPortal(
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.99) 0%, rgba(10,15,30,0.99) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 32px 100px rgba(0,0,0,0.8), 0 0 60px rgba(16,185,129,0.06)',
              animation: 'slideUp 0.25s ease',
              position: 'relative'
            }}
          >
            {/* Header do modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '8px', padding: '6px 8px'
                  }}>🎯</span>
                  Protocolo Clínico
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {items.length} ações recomendadas pela IA
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
            </div>

            {/* Lista de ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '14px 16px',
                  background: 'rgba(16,185,129,0.04)',
                  border: '1px solid rgba(16,185,129,0.12)',
                  borderRadius: '10px'
                }}>
                  <span style={{
                    minWidth: '24px', height: '24px', borderRadius: '50%',
                    background: 'rgba(16,185,129,0.2)', color: '#10b981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700', flexShrink: 0, marginTop: '2px'
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Exams;
