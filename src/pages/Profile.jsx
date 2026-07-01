import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Target, Save, AlertCircle, Sparkles, Dna, ChevronDown, ChevronUp } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userId, setUserId] = useState(null);

  // Form State - Goal
  const [goal, setGoal] = useState({ goal_type: '', description: '' });
  
  // Form State - Medical History (Basic & Advanced)
  const [history, setHistory] = useState({
    filled_by_ai: false,
    water_intake: '',
    meal_quality: 5,
    diet_restrictions: [],
    workout_days: 0,
    sleep_hours: '',
    sleep_restorative: '',
    chronic_diseases: '',
    allergies: '', // Keep for retro-compatibility
    family_history: '',
    advanced_anamnesis: {}
  });

  const [expandedSection, setExpandedSection] = useState(null);

  const categories = [
    { id: 'Longevidade', label: 'Saúde & Longevidade' },
    { id: 'Emagrecimento', label: 'Emagrecimento Acelerado' },
    { id: 'Hipertrofia', label: 'Hipertrofia & Força Bruta' },
    { id: 'Performance', label: 'Performance Esportiva de Elite' },
    { id: 'Recuperacao', label: 'Reabilitação & Fisioterapia' }
  ];

  const toggleCategory = (catId) => {
    let currentTypes = goal.goal_type ? goal.goal_type.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentTypes.includes(catId)) {
      currentTypes = currentTypes.filter(c => c !== catId);
    } else {
      currentTypes.push(catId);
    }
    setGoal({ ...goal, goal_type: currentTypes.join(', ') });
  };

  const handleRestrictionToggle = (restriction) => {
    setHistory(prev => {
      const restr = prev.diet_restrictions || [];
      return {
        ...prev,
        diet_restrictions: restr.includes(restriction) ? restr.filter(r => r !== restriction) : [...restr, restriction]
      };
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const uid = session.user.id;
      setUserId(uid);

      // Fetch Goal
      const { data: goalData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
        .single();
        
      if (goalData) {
        setGoal({ goal_type: goalData.goal_type, description: goalData.description || '' });
      }

      // Fetch Medical History
      const { data: medicalData } = await supabase
        .from('medical_history')
        .select('*')
        .eq('user_id', uid)
        .single();

      if (medicalData && medicalData.baseline_data) {
        const b = medicalData.baseline_data;
        setHistory({
          filled_by_ai: b.filled_by_ai || false,
          water_intake: b.water_intake || '',
          meal_quality: b.meal_quality !== undefined ? b.meal_quality : 5,
          diet_restrictions: b.diet_restrictions || [],
          workout_days: b.workout_days || 0,
          sleep_hours: b.sleep_hours || '',
          sleep_restorative: b.sleep_restorative || '',
          chronic_diseases: b.chronic_diseases || '',
          allergies: b.allergies || '',
          family_history: b.family_history || '',
          advanced_anamnesis: b.advanced_anamnesis || {}
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Upsert Goal
      const { data: existingGoal } = await supabase
        .from('user_goals')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (existingGoal) {
        await supabase.from('user_goals').update({
          goal_type: goal.goal_type || 'Geral',
          description: goal.description
        }).eq('id', existingGoal.id);
      } else {
        await supabase.from('user_goals').insert({
          user_id: userId,
          goal_type: goal.goal_type || 'Geral',
          description: goal.description
        });
      }

      // 2. Upsert Medical History
      const { data: existingHistory } = await supabase
        .from('medical_history')
        .select('id')
        .eq('user_id', userId)
        .single();

      const baselineData = {
        water_intake: history.water_intake,
        meal_quality: history.meal_quality,
        diet_restrictions: history.diet_restrictions,
        workout_days: history.workout_days,
        sleep_hours: history.sleep_hours,
        sleep_restorative: history.sleep_restorative,
        chronic_diseases: history.chronic_diseases,
        allergies: history.allergies,
        family_history: history.family_history,
        advanced_anamnesis: history.advanced_anamnesis,
        filled_by_ai: history.filled_by_ai
      };

      if (existingHistory) {
        await supabase.from('medical_history').update({
          baseline_data: baselineData,
          updated_at: new Date()
        }).eq('id', existingHistory.id);
      } else {
        await supabase.from('medical_history').insert({
          user_id: userId,
          baseline_data: baselineData
        });
      }

      setMessage({ type: 'success', text: 'Sincronização Neural Concluída. Os Agentes já estão cientes.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);

    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Falha na sincronização dos dados.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const updateAdvanced = (key, value) => {
    setHistory({
      ...history,
      advanced_anamnesis: {
        ...history.advanced_anamnesis,
        [key]: value
      }
    });
  };

  if (loading) return <div className="module-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><div className="loader"></div></div>;

  return (
    <div className="module-container profile-container">
      <header className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '400', letterSpacing: '-0.5px', margin: 0 }}>
            <Target size={24} color="#fff" /> Perfil e Metas
          </h1>
          <p style={{ color: '#888', fontSize: '15px', fontWeight: '400', letterSpacing: '-0.2px', margin: 0 }}>
            / Afinamento do Gêmeo Digital
          </p>
        </div>

        <button 
          className="sync-btn" 
          style={{ width: '44px', height: '44px', padding: 0, margin: 0, borderRadius: '8px' }}
          onClick={handleSave}
          disabled={saving}
          title="Salvar alterações"
        >
          <Save size={20} />
        </button>
      </header>

      {message.text && (
        <div className={`toast-notification ${message.type}`}>
          {message.type === 'success' ? <Sparkles size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-grid">

        {/* Card Esquerdo: Objetivos */}
        <div className="profile-card">
          <div className="card-header">
            <div className="icon-wrapper">
              <Sparkles size={20} color="#fff" />
            </div>
            <h2>Definição de Objetivo</h2>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label>Categorias Principais (Múltipla escolha)</label>
              <div className="pills-container">
                {categories.map(cat => {
                  const isActive = (goal.goal_type || '').includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`pill-btn ${isActive ? 'active' : ''}`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label>Detalhamento do seu Objetivo</label>
              <textarea
                className="glass-input unified-textarea"
                style={{ flex: 1, minHeight: '120px', resize: 'none' }}
                placeholder="Descreva aqui o contexto..."
                value={goal.description}
                onChange={e => setGoal({...goal, description: e.target.value})}
              />
              <div className="input-hint">
                <span>Os agentes de I.A. vão ler isso para adaptar sua rotina.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Direito: Anamnese Básica */}
        <div className="profile-card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="icon-wrapper">
                <Dna size={20} color="#fff" />
              </div>
              <h2>Anamnese & Genética</h2>
            </div>
            {history.filled_by_ai && (
              <span style={{ fontSize: '11px', color: '#888', padding: '4px 8px', border: '1px solid #333', borderRadius: '4px' }}>
                Preenchido por I.A.
              </span>
            )}
          </div>

          <div className="card-body" style={{ gap: '24px' }}>
            
            {/* Secão Básica */}
            <div className="basic-anamnesis">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Consumo de Água (Diário)</label>
                  <select className="glass-input" value={history.water_intake} onChange={e => setHistory({...history, water_intake: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="< 1L">Menos de 1L</option>
                    <option value="1 a 2L">1 a 2 Litros</option>
                    <option value="2 a 3L">2 a 3 Litros</option>
                    <option value="> 3L">Mais de 3L</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Qualidade da Dieta (0 a 10)</label>
                  <input type="range" min="0" max="10" className="glass-input" style={{padding:0, height:'2px'}} value={history.meal_quality} onChange={e => setHistory({...history, meal_quality: parseInt(e.target.value)})} />
                  <div style={{textAlign:'center', color:'var(--primary)', fontWeight:'bold', marginTop:'5px'}}>{history.meal_quality} / 10</div>
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Restrições Alimentares</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                  {['Vegano', 'Vegetariano', 'Celíaco', 'Intolerante a Lactose', 'Alergia Grave'].map(res => (
                    <button 
                      key={res}
                      className={`pill-btn ${(history.diet_restrictions || []).includes(res) ? 'active' : ''}`}
                      onClick={() => handleRestrictionToggle(res)}
                      style={{padding: '4px 10px', fontSize: '12px'}}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Dias de Treino na Semana</label>
                  <select className="glass-input" value={history.workout_days} onChange={e => setHistory({...history, workout_days: parseInt(e.target.value)})}>
                    {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} dias</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Horas de Sono por Noite</label>
                  <select className="glass-input" value={history.sleep_hours} onChange={e => setHistory({...history, sleep_hours: e.target.value})}>
                    <option value="">Selecione...</option>
                    <option value="< 5h">Menos de 5h</option>
                    <option value="5-7h">Entre 5 e 7h</option>
                    <option value="7-8h">Entre 7 e 8h</option>
                    <option value="> 8h">Mais de 8h</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Condições Crônicas, Lesões ou Remédios Frequentes</label>
                <textarea
                  className="glass-input unified-textarea"
                  style={{ minHeight: '80px', resize: 'none' }}
                  placeholder="Ex: Asma grau 1, hipertensão, uso de roacutan..."
                  value={history.chronic_diseases}
                  onChange={e => setHistory({...history, chronic_diseases: e.target.value})}
                />
              </div>
            </div>

            {/* Expansão Avançada */}
            <div className="advanced-anamnesis-toggle" onClick={() => toggleSection('advanced')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
              padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
              cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', marginTop: '10px'
            }}>
              <span style={{color: 'var(--text-main)', fontSize: '14px', fontWeight: '500'}}>
                {expandedSection === 'advanced' ? 'Esconder Anamnese Completa' : 'Expandir Anamnese Completa'}
              </span>
              {expandedSection === 'advanced' ? <ChevronUp size={16} color="var(--text-muted)"/> : <ChevronDown size={16} color="var(--text-muted)"/>}
            </div>

            {expandedSection === 'advanced' && (
              <div className="advanced-sections fade-in" style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                
                {/* Seção: Saúde Digestiva */}
                <div className="form-group" style={{background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px'}}>
                  <label style={{color: '#fff', marginBottom: '12px'}}>Saúde Digestiva e Intestinal</label>
                  
                  <label style={{fontSize: '12px'}}>Formato das Fezes</label>
                  <select className="glass-input" style={{marginBottom: '12px'}} value={history.advanced_anamnesis.bowel_type || ''} onChange={e => updateAdvanced('bowel_type', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Duras">Duras/Compactadas</option>
                    <option value="Firmes">Firmes</option>
                    <option value="Macias">Macias/Pastosas</option>
                    <option value="Soltas">Soltas/Líquidas</option>
                  </select>

                  <label style={{fontSize: '12px'}}>Frequência de Evacuação</label>
                  <select className="glass-input" value={history.advanced_anamnesis.bowel_freq || ''} onChange={e => updateAdvanced('bowel_freq', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="A cada 2+ dias">A cada 2 dias ou mais</option>
                    <option value="1x/dia">1 vez ao dia</option>
                    <option value="2x/dia">2 vezes ao dia</option>
                    <option value="3+/dia">3 ou mais vezes ao dia</option>
                  </select>
                </div>

                {/* Seção: Saúde Mental */}
                <div className="form-group" style={{background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px'}}>
                  <label style={{color: '#fff', marginBottom: '12px'}}>Saúde Mental e Foco</label>
                  
                  <label style={{fontSize: '12px'}}>Nível de Estresse/Ansiedade (0-10)</label>
                  <input type="range" min="0" max="10" className="glass-input" style={{padding:0, height:'2px', marginBottom:'16px'}} value={history.advanced_anamnesis.stress_level || 0} onChange={e => updateAdvanced('stress_level', parseInt(e.target.value))} />
                  
                  <label style={{fontSize: '12px'}}>Estratégias de Relaxamento que Utiliza</label>
                  <input type="text" className="glass-input" placeholder="Ex: Terapia, Yoga, Meditação..." value={history.advanced_anamnesis.relax_strategies || ''} onChange={e => updateAdvanced('relax_strategies', e.target.value)}/>
                </div>

                {/* Seção: Sintomas Gerais */}
                <div className="form-group" style={{background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px'}}>
                  <label style={{color: '#fff', marginBottom: '12px'}}>Sintomas Frequentes</label>
                  <textarea 
                    className="glass-input unified-textarea" 
                    style={{minHeight: '80px', resize: 'none'}} 
                    placeholder="Descreva se sente dores de cabeça, queimação, fadiga, queda de cabelo, etc..."
                    value={history.advanced_anamnesis.symptoms || ''}
                    onChange={e => updateAdvanced('symptoms', e.target.value)}
                  />
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
