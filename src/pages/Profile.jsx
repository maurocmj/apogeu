import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Target, Activity, Save, AlertCircle, Sparkles, HeartPulse, Dna } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userId, setUserId] = useState(null);

  // Form State
  const [goal, setGoal] = useState({ goal_type: '', description: '' });
  const [medicalHistory, setMedicalHistory] = useState({ allergies: '', chronic_diseases: '', family_history: '', filled_by_ai: false });

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
        setMedicalHistory({
          allergies: medicalData.baseline_data.allergies || '',
          chronic_diseases: medicalData.baseline_data.chronic_diseases || '',
          family_history: medicalData.baseline_data.family_history || ''
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
        allergies: medicalHistory.allergies,
        chronic_diseases: medicalHistory.chronic_diseases,
        family_history: medicalHistory.family_history
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

  if (loading) return <div className="module-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><div className="loader"></div></div>;

  return (
    <div className="module-container profile-container">
      <header className="page-header">
        <h1 className="neon-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Target size={32} color="var(--primary)" /> Perfil e Metas
        </h1>
        <p>Afinamento do Gêmeo Digital e Memória Base dos Agentes</p>
      </header>

      {message.text && (
        <div className={`toast-notification ${message.type}`}>
          {message.type === 'success' ? <Sparkles size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-grid">
        {/* Lado Esquerdo: Objetivos */}
        <div className="glass profile-card hover-glow">
          <div className="card-header">
            <div className="icon-wrapper primary-glow">
              <Sparkles size={24} color="var(--primary)" />
            </div>
            <h2>Definição de Objetivo</h2>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label>1. Categorias Principais (Múltipla escolha)</label>
              <div className="pills-container">
              {categories.map(cat => {
                const isActive = (goal.goal_type || '').includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`pill-btn ${isActive ? 'active' : ''}`}
                    style={{
                      background: isActive ? 'rgba(0, 229, 255, 0.1)' : 'rgba(0, 0, 0, 0.4)',
                      border: `1px solid ${isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>2. Detalhamento do seu Objetivo</label>
            <textarea 
              className="glass-input unified-textarea"
              placeholder="Descreva aqui o contexto. Ex: Escolhi Emagrecimento porque quero baixar meu BF para 12% sem perder massa magra, mas estou com um leve incômodo no joelho..."
              value={goal.description}
              onChange={e => setGoal({...goal, description: e.target.value})}
            />
            <div className="input-hint">
              <Target size={16} /> 
              <span>Os agentes de I.A. vão ler isso para adaptar sua dieta e treinos.</span>
            </div>
          </div>
          </div>
        </div>

        {/* Lado Direito: Anamnese */}
        <div className="glass profile-card hover-glow">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="icon-wrapper accent-glow">
                <Dna size={24} color="var(--accent)" />
              </div>
              <h2>Anamnese & Genética</h2>
            </div>
            {medicalHistory.filled_by_ai && (
              <span style={{ fontSize: '11px', background: 'rgba(189, 0, 255, 0.1)', border: '1px solid rgba(189, 0, 255, 0.3)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                Preenchido por I.A.
              </span>
            )}
          </div>

          <div className="card-body">
            <div className="form-group">
              <label>Alergias ou Intolerâncias Sensíveis</label>
              <input 
                type="text"
                className="glass-input"
                placeholder="Ex: Intolerância à lactose, alergia a corantes..."
                value={medicalHistory.allergies}
                onChange={e => setMedicalHistory({...medicalHistory, allergies: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Condições Crônicas ou Lesões Prévias</label>
              <textarea 
                className="glass-input unified-textarea"
                placeholder="Ex: Asma grau 1, hipertensão controlada, cirurgia no joelho em 2021..."
                value={medicalHistory.chronic_diseases}
                onChange={e => setMedicalHistory({...medicalHistory, chronic_diseases: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Histórico Familiar e Propensões</label>
              <textarea 
                className="glass-input unified-textarea"
                placeholder="Ex: Pai diabético tipo 2, avô paterno infartou aos 60 anos..."
                value={medicalHistory.family_history}
                onChange={e => setMedicalHistory({...medicalHistory, family_history: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button 
          className="sync-btn" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sincronizando Core...' : (
            <><HeartPulse size={24} /> Sincronizar Gêmeo Digital</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Profile;
