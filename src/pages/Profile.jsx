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
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: '400', letterSpacing: '-0.5px', margin: 0 }}>
          <Target size={24} color="#fff" /> Perfil e Metas
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>Afinamento do Gêmeo Digital e Memória Base</p>
      </header>

      {message.text && (
        <div className={`toast-notification ${message.type}`}>
          {message.type === 'success' ? <Sparkles size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-grid">
        {/* Lado Esquerdo: Objetivos */}
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

          <div className="form-group">
            <label>Detalhamento do seu Objetivo</label>
            <textarea 
              className="glass-input unified-textarea"
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

        {/* Lado Direito: Anamnese */}
        <div className="profile-card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="icon-wrapper">
                <Dna size={20} color="#fff" />
              </div>
              <h2>Anamnese & Genética</h2>
            </div>
            {medicalHistory.filled_by_ai && (
              <span style={{ fontSize: '11px', color: '#888', padding: '4px 8px', border: '1px solid #333', borderRadius: '4px' }}>
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
