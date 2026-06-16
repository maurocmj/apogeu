import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, ExternalLink, ShieldAlert, Target, Loader2, Save, Info, Download, ChevronDown, ChevronUp, Activity, Heart } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ChatWidget from '../components/ChatWidget';
import ActionPlanCard from '../components/ActionPlanCard';
import HealthRadarChart from '../components/HealthRadarChart';
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

  const lastExamDate = latestProcessedExam ? new Date(latestProcessedExam.collection_date).toLocaleDateString() : 'N/A';
  let totalBiomarkers = 0;
  exams.forEach(ex => {
    if (ex.biomarkers) {
      totalBiomarkers += Object.keys(ex.biomarkers).length;
    }
  });

  return (
    <div className="home-container" style={{ padding: 0 }}>
      
      <header className="page-header" style={{ gridColumn: '1 / -1', marginBottom: '0' }}>
        <h1 className="neon-text">Saúde Global</h1>
        <p>Análise 360º dos seus indicadores clínicos, métricas e exames</p>
      </header>

      {/* Main Column */}
      <main className="home-main-col" style={{ marginTop: '24px' }}>
        
        {/* Radar e Visão Geral */}
        <div className="feed-card glass">
          <div className="feed-header">
            <h3>Visão Geral Clínica</h3>
            <span className="badge">Atualizado {lastExamDate !== 'N/A' ? lastExamDate : 'hoje'}</span>
          </div>
          <div className="radar-section">
            <div className="radar-chart-wrapper">
              <HealthRadarChart />
            </div>
            <div className="radar-insights">
              <div className="insight-item positive">
                <strong>Último Checkup:</strong> {lastExamDate}
              </div>
              <div className="insight-item positive">
                <strong>Indicadores Analisados:</strong> {totalBiomarkers} ao longo do tempo.
              </div>
              <div className="insight-item warning">
                <strong>Atenção Primária:</strong> Parâmetros metabólicos merecem observação nas próximas semanas.
              </div>
            </div>
          </div>
        </div>

        {/* Upload Compacto */}
        <div className="glass" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Upload color="var(--primary)" size={20} /> Adicionar Novo Laudo
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF apenas</span>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '48px',
                background: selectedFile ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                border: selectedFile ? '1px solid var(--primary)' : '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              className="hover-glow"
            >
              <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
              <span style={{ color: selectedFile ? 'white' : 'var(--text-muted)', fontSize: '14px' }}>
                {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo...'}
              </span>
            </label>

            <button 
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="btn-primary" 
              style={{ height: '48px', padding: '0 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              {uploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {uploading ? 'Analisando...' : 'Enviar Laudo'}
            </button>
          </div>
        </div>

        {/* Histórico / Linha do Tempo */}
        <h3 className="section-title">Linha do Tempo Clínica</h3>
        
        {exams.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum laudo cadastrado ainda.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exams.map((exam, index) => (
            <div key={exam.id} className="glass p-6 rounded-xl hover-glow">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: expandedExams[exam.id] ? '16px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '50%' }}>
                    <Activity color="var(--primary)" size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', marginTop: 0 }}>{exam.exam_type}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                      Coletado em {new Date(exam.collection_date).toLocaleDateString()}
                      {` • Lab: ${exam.laboratory_name && exam.laboratory_name !== 'null' ? exam.laboratory_name : 'Não identificado'}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {exam.status === 'processing' ? (
                    <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 className="animate-spin" size={12} /> IA Lendo...
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px' }}>Dados Extraídos</span>
                  )}
                  {exam.document_url && (
                    <a href={exam.document_url} target="_blank" rel="noreferrer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Baixar Original">
                      <Download size={18} color="var(--primary)" />
                    </a>
                  )}
                  <button onClick={() => toggleExam(exam.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '8px' }}>
                    {expandedExams[exam.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {expandedExams[exam.id] && exam.ai_insights && exam.ai_insights.chat_message && (
                <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '4px', marginBottom: '16px', marginTop: '16px' }}>
                  <p style={{ color: 'white', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                    {exam.ai_insights.chat_message}
                  </p>
                </div>
              )}
              
              {expandedExams[exam.id] && exam.biomarkers && Object.keys(exam.biomarkers).length > 0 && (
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{Object.keys(exam.biomarkers || {}).length} Indicadores Clínicos Encontrados</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', padding: '16px' }}>
                    {Object.entries(exam.biomarkers).map(([key, value]) => {
                      const valObj = typeof value === 'object' ? value : { value: value, status: 'normal' };
                      const borderColor = getStatusColor(valObj.status);
                      return (
                        <div key={key} style={{ background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '4px', border: `1px solid ${borderColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
                            <div 
                              onMouseEnter={(e) => handleMouseEnter(e, key)} 
                              onMouseLeave={handleMouseLeave}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', cursor: 'help' }}
                            >
                              {loadingInfo[key] ? <Loader2 size={12} className="animate-spin" color="var(--primary)" /> : <Info size={12} color="var(--text-muted)" />}
                            </div>
                          </div>
                          <strong style={{ fontSize: '14px', color: 'white' }}>{String(valObj.value)}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Right Column: AI Chat & Plan */}
      <aside className="home-right-col" style={{ marginTop: '24px' }}>
        <ChatWidget 
          agentName="Medical Agent" 
          icon={Heart} 
          agentColor="#ef4444" 
          initialMessage={initialMessage} 
        />

        {actionPlanItems.length > 0 && (
          <ActionPlanCard 
            title="Protocolo Clínico"
            icon={Target}
            color="#ef4444"
            items={actionPlanItems}
          />
        )}
      </aside>

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
