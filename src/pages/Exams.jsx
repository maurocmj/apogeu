import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, ExternalLink, ShieldAlert, Target, Loader2, Save, Info, Download, ChevronDown, ChevronUp, Activity, Heart, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ChatWidget from '../components/ChatWidget';
import ActionPlanCard from '../components/ActionPlanCard';
import HealthRadarChart from '../components/HealthRadarChart';
import HealthScoreTimelineChart from '../components/HealthScoreTimelineChart';
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [exams, setExams] = useState([]);
  const [userId, setUserId] = useState(null);
  const [biomarkerDict, setBiomarkerDict] = useState({});
  const [loadingInfo, setLoadingInfo] = useState({});
  const [tooltip, setTooltip] = useState({ isOpen: false, key: '', content: '', x: 0, y: 0 });
  const [expandedExams, setExpandedExams] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        fetchExams(session.user.id);
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

  const fetchExams = async (uid) => {
    const { data } = await supabase
      .from('medical_exams')
      .select('*')
      .eq('user_id', uid)
      .order('collection_date', { ascending: false });
    if (data) {
      setExams(data);
      if (data.length > 0) {
        setExpandedExams({ [data[0].id]: true }); // expand the latest by default
      }
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
          body: { biomarkerKey: key, openaiKey: import.meta.env.VITE_OPENAI_API_KEY }
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!userId) return;

    setUploading(true);

    try {
      let reportContent = '';
      let filePublicUrl = null;
      let examTitle = selectedFile.name || 'Laudo de Sangue (Arquivo)';

      if (selectedFile.type === 'application/pdf') {
        reportContent = await extractTextFromPDF(selectedFile);
        
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('medical_exams_files').upload(filePath, selectedFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('medical_exams_files').getPublicUrl(filePath);
          filePublicUrl = publicUrl;
        }
      } else {
        alert("Nesta versão o leitor suporta apenas arquivos PDF.");
        setUploading(false);
        return;
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

      setExams([newExam, ...exams]);
      setSelectedFile(null);

      supabase.functions.invoke('exam-parser-service', {
        body: { examId: newExam.id, openaiKey: import.meta.env.VITE_OPENAI_API_KEY }
      }).catch(e => console.log("Edge function rodando em background...", e));
      
      let isProcessed = false;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const { data: checkData } = await supabase.from('medical_exams').select('status').eq('id', newExam.id).single();
        if (checkData?.status === 'processed') {
          isProcessed = true;
          break;
        }
      }

      if (!isProcessed) {
        throw new Error("O processamento está demorando mais que o esperado. Atualize a página em alguns segundos.");
      }

      const { error: agentError } = await supabase.functions.invoke('medical-agent-service', {
        body: { examId: newExam.id, openaiKey: import.meta.env.VITE_OPENAI_API_KEY }
      });

      if (agentError) throw agentError;

      fetchExams(userId);
      
    } catch (e) {
      console.error("Erro no processamento de IA:", e);
      alert('Erro ao processar exame: ' + (e.message || JSON.stringify(e)));
    } finally {
      setUploading(false);
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
    <div className="home-container" style={{ padding: 0, gridTemplateColumns: '450px 1fr', alignItems: 'stretch', marginTop: '24px' }}>
      {/* Main Column: Radar e Visão Geral */}
      <main className="home-main-col feed-card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '20px' }}>
        <div>
          <div className="feed-header" style={{ marginBottom: '16px' }}>
            <h3>Visão Geral Clínica</h3>
            <span className="badge">Atualizado {lastExamDate !== 'N/A' ? lastExamDate : 'hoje'}</span>
          </div>
          <div className="radar-chart-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
            <div style={{ width: '100%', maxWidth: '320px' }}>
              <HealthRadarChart exams={exams} />
            </div>
          </div>
        </div>

        {/* Resumo de Dados Integrado */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
          paddingTop: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(0, 229, 255, 0.5)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Checkup</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{lastExamDate}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(16, 185, 129, 0.5)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Indicadores</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{totalBiomarkers}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(245, 158, 11, 0.5)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Atenção</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Risco Metabólico">Metabólico</span>
          </div>
        </div>
      </main>

      {/* Right Column: Timeline Score Chart */}
      <aside className="home-right-col feed-card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className="feed-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Histórico de Score Clínico</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Score Geral unificado & Sistemas</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="badge" style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--primary)', border: '1px solid rgba(0, 229, 255, 0.25)', fontWeight: '700', fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}>
              Geral: 90%
            </span>
          </div>
        </div>
        <HealthScoreTimelineChart />
      </aside>

      {/* Protocolo Clínico & Medical Agent Chat (Side-by-side below) */}
      <section style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '24px', marginBottom: '8px' }}>
        <div>
          {actionPlanItems.length > 0 ? (
            <ActionPlanCard 
              title="Protocolo Clínico"
              icon={Target}
              color="#10b981"
              items={actionPlanItems}
            />
          ) : (
            <div className="glass" style={{ padding: '24px', borderRadius: '12px', height: '100%', minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <Target size={40} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <strong style={{ color: 'white', display: 'block', marginBottom: '8px' }}>Nenhum Protocolo Ativo</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '280px' }}>Envie um laudo de exame na tabela abaixo para que a I.A. gere o seu plano de ação clínico.</p>
            </div>
          )}
        </div>
        <div>
          <ChatWidget 
            agentName="Medical Agent" 
            icon={Heart} 
            agentColor="#10b981" 
            initialMessage={initialMessage} 
            context={examContext}
          />
        </div>
      </section>

      {/* Tabela de Linha do Tempo Clínica */}
      <section style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '32px' }}>
        <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity color="var(--primary)" size={20} /> Histórico de Exames
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '36px',
                  padding: '0 16px',
                  background: selectedFile ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                  border: selectedFile ? '1px solid var(--primary)' : '1px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                className="hover-glow"
              >
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                <span style={{ color: selectedFile ? 'white' : 'var(--text-muted)', fontSize: '13px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedFile ? selectedFile.name : 'Selecionar PDF...'}
                </span>
              </label>

              <button 
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="btn-primary" 
                style={{ height: '36px', padding: '0 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
              >
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                {uploading ? 'Enviando...' : 'Adicionar'}
              </button>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Exame</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Data</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Laboratório</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'right' }}>Ações</th>
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
                          <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Loader2 className="animate-spin" size={12} /> Lendo
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px' }}>Extraído</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                          {exam.document_url && (
                            <a href={exam.document_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Baixar Original">
                              <Download size={18} color="var(--primary)" />
                            </a>
                          )}
                          {expandedExams[exam.id] ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                        </div>
                      </td>
                    </tr>
                    
                    {expandedExams[exam.id] && (
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <td colSpan={5} style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {exam.ai_insights && exam.ai_insights.chat_message && (
                            <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginBottom: '16px' }}>
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
                            <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                                {Object.entries(exam.biomarkers).map(([key, value]) => {
                                  const valObj = typeof value === 'object' ? value : { value: value, status: 'normal' };
                                  const borderColor = getStatusColor(valObj.status);
                                  return (
                                    <div key={key} style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '6px', border: `1px solid ${borderColor}`, transition: 'all 0.2s ease' }} className="hover-glow">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px', lineHeight: '1.2' }}>{key.replace(/_/g, ' ')}</span>
                                        <div 
                                          onMouseEnter={(e) => handleMouseEnter(e, key)} 
                                          onMouseLeave={handleMouseLeave}
                                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', marginLeft: '4px', flexShrink: 0 }}
                                        >
                                          {loadingInfo[key] ? <Loader2 size={12} className="animate-spin" color="var(--primary)" /> : <Info size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />}
                                        </div>
                                      </div>
                                      <strong style={{ fontSize: '14px', color: 'white' }}>{String(valObj.value)}</strong>
                                    </div>
                                  );
                                })}
                              </div>
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
        </div>
      </section>

      {/* Tooltip Modal */}
      {tooltip.isOpen && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 10, transform: 'translate(-50%, -100%)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 229, 255, 0.3)', padding: '16px', borderRadius: '12px',
          width: 'max-content', maxWidth: '300px', color: 'white', fontSize: '14px', zIndex: 9999,
          pointerEvents: 'none', boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Info color="var(--primary)" size={16} />
            <strong style={{ color: 'var(--primary)' }}>{tooltip.key.replace(/_/g, ' ').toUpperCase()}</strong>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: '1.5' }}>
            {tooltip.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default Exams;
