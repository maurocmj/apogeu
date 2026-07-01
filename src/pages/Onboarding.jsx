import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowRight, SkipForward, Upload, Camera, Activity, Watch, Link, MapPin, Search } from 'lucide-react';
import ECGBackground from '../components/ECGBackground';
import './Onboarding.css';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // States para salvar - Goal
  const [goalType, setGoalType] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  
  // States para salvar - Anamnese Básica
  const [waterIntake, setWaterIntake] = useState('');
  const [mealQuality, setMealQuality] = useState(5);
  const [dietRestrictions, setDietRestrictions] = useState([]);
  const [workoutDays, setWorkoutDays] = useState(0);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepRestorative, setSleepRestorative] = useState('');
  
  const [userId, setUserId] = useState(null);

  const totalSteps = 7;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const nextStep = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await handleFinish();
    }
  };

  const skipStep = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await handleFinish();
    }
  };

  const handleRestrictionToggle = (restriction) => {
    setDietRestrictions(prev => 
      prev.includes(restriction) 
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const handleFinish = async () => {
    if (!userId) {
      navigate('/dashboard');
      return;
    }
    
    setSaving(true);
    try {
      // Salva Objetivo
      if (goalType || goalDesc) {
        await supabase.from('user_goals').insert({
          user_id: userId,
          goal_type: goalType || 'Geral',
          description: goalDesc
        });
      }

      // Salva Anamnese Base (JSON)
      const baselineData = {
        water_intake: waterIntake,
        meal_quality: mealQuality,
        diet_restrictions: dietRestrictions,
        workout_days: workoutDays,
        sleep_hours: sleepHours,
        sleep_restorative: sleepRestorative
      };

      await supabase.from('medical_history').insert({
        user_id: userId,
        baseline_data: baselineData
      });

      // Atualiza a flag na tabela de perfis
      await supabase.from('profiles').update({
        has_completed_onboarding: true
      }).eq('id', userId);

    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      navigate('/dashboard');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Plataforma de Treino</h2>
            <p>Conecte seus dados em tempo real para a inteligência artificial do APOGEU analisar sua performance.</p>
            <div className="platform-options">
              <button className="platform-btn strava">
                <Activity size={20} /> Conectar Strava
              </button>
              <button className="platform-btn garmin">
                <Watch size={20} /> Conectar Garmin
              </button>
              <button className="platform-btn none">
                Não utilizo plataforma de treino
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Histórico de Saúde</h2>
            <p>Importe exames de sangue, laudos ou avaliações corporais anteriores.</p>
            <div className="upload-box">
              <Upload size={32} color="var(--primary)" />
              <span>Arraste seus PDFs ou imagens aqui</span>
              <span className="upload-sub">ou clique para selecionar</span>
            </div>
            <button className="btn-secondary mt-16"><Link size={16}/> Importar de Arquivo Eletrônico (EHR)</button>
          </div>
        );
      case 3:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Conexão com Laboratórios</h2>
            <p>Integre seus exames automaticamente. Qual a sua localização para buscarmos laboratórios parceiros?</p>
            <div className="location-input" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <MapPin size={20} color="var(--primary)" style={{ marginTop: '10px' }} />
              <input type="text" className="goal-textarea" style={{ minHeight: '40px', marginTop: '0' }} placeholder="Sua cidade (ex: Belo Horizonte, MG)..." />
            </div>
            <div className="platform-options">
              <button className="platform-btn">
                <Search size={20} /> Hermes Pardini
              </button>
              <button className="platform-btn">
                <Search size={20} /> São Marcos
              </button>
              <button className="platform-btn none">
                Outro laboratório / Adicionar depois
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Seu Objetivo Principal</h2>
            <p>Onde o APOGEU deve concentrar a maior parte do poder computacional?</p>
            <div className="goal-options">
              <button className={`goal-btn ${goalType === 'Performance Esportiva' ? 'active' : ''}`} onClick={() => setGoalType('Performance Esportiva')}>Performance Esportiva</button>
              <button className={`goal-btn ${goalType === 'Emagrecimento / Estética' ? 'active' : ''}`} onClick={() => setGoalType('Emagrecimento / Estética')}>Emagrecimento / Estética</button>
              <button className={`goal-btn ${goalType === 'Saúde e Longevidade' ? 'active' : ''}`} onClick={() => setGoalType('Saúde e Longevidade')}>Saúde e Longevidade</button>
              <button className={`goal-btn ${goalType === 'Recuperação de Lesão' ? 'active' : ''}`} onClick={() => setGoalType('Recuperação de Lesão')}>Recuperação de Lesão</button>
            </div>
            <textarea 
              className="goal-textarea" 
              placeholder="Detalhe um pouco mais. Ex: Correr uma maratona sub 3h30..."
              value={goalDesc}
              onChange={e => setGoalDesc(e.target.value)}
            />
          </div>
        );
      case 5:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Alimentação & Hidratação</h2>
            <p>Conte-nos um pouco sobre a sua base nutricional.</p>
            
            <div style={{textAlign: 'left', marginTop: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#fff', fontSize: '14px'}}>Quantos litros de água você bebe por dia?</label>
              <div className="platform-options" style={{gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                <button className={`platform-btn ${waterIntake === '< 1L' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setWaterIntake('< 1L')}>Menos de 1L</button>
                <button className={`platform-btn ${waterIntake === '1 a 2L' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setWaterIntake('1 a 2L')}>1 a 2 Litros</button>
                <button className={`platform-btn ${waterIntake === '2 a 3L' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setWaterIntake('2 a 3L')}>2 a 3 Litros</button>
                <button className={`platform-btn ${waterIntake === '> 3L' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setWaterIntake('> 3L')}>Mais de 3L</button>
              </div>

              <label style={{display: 'block', marginTop: '24px', marginBottom: '8px', color: '#fff', fontSize: '14px'}}>Avalie a qualidade das suas refeições (0 a 10)</label>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <input type="range" min="0" max="10" value={mealQuality} onChange={e => setMealQuality(parseInt(e.target.value))} style={{flex: 1, accentColor: 'var(--primary)'}} />
                <span style={{color: 'var(--primary)', fontWeight: 'bold', fontSize: '18px', width: '20px'}}>{mealQuality}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)'}}>
                <span>Ultraprocessados</span>
                <span>Comida de Verdade</span>
              </div>

              <label style={{display: 'block', marginTop: '24px', marginBottom: '8px', color: '#fff', fontSize: '14px'}}>Você possui alguma restrição alimentar?</label>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                {['Vegano', 'Vegetariano', 'Celíaco', 'Intolerante a Lactose', 'Alergia Grave'].map(res => (
                  <button 
                    key={res}
                    className={`goal-btn ${dietRestrictions.includes(res) ? 'active' : ''}`} 
                    style={{padding: '6px 12px', fontSize: '12px'}}
                    onClick={() => handleRestrictionToggle(res)}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Movimento & Sono</h2>
            <p>O descanso é tão importante quanto o treino.</p>
            
            <div style={{textAlign: 'left', marginTop: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', color: '#fff', fontSize: '14px'}}>Quantos dias por semana você se exercita?</label>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <input type="range" min="0" max="7" value={workoutDays} onChange={e => setWorkoutDays(parseInt(e.target.value))} style={{flex: 1, accentColor: 'var(--primary)'}} />
                <span style={{color: 'var(--primary)', fontWeight: 'bold', fontSize: '18px', width: '20px'}}>{workoutDays}</span>
              </div>

              <label style={{display: 'block', marginTop: '24px', marginBottom: '8px', color: '#fff', fontSize: '14px'}}>Quantas horas de sono por noite?</label>
              <div className="platform-options" style={{gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                <button className={`platform-btn ${sleepHours === '< 5h' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setSleepHours('< 5h')}>Menos de 5h</button>
                <button className={`platform-btn ${sleepHours === '5-7h' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setSleepHours('5-7h')}>Entre 5h e 7h</button>
                <button className={`platform-btn ${sleepHours === '7-8h' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setSleepHours('7-8h')}>Entre 7h e 8h</button>
                <button className={`platform-btn ${sleepHours === '> 8h' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setSleepHours('> 8h')}>Mais de 8h</button>
              </div>

              <label style={{display: 'block', marginTop: '24px', marginBottom: '8px', color: '#fff', fontSize: '14px'}}>Você acorda com energia (sono restaurador)?</label>
              <div className="platform-options" style={{gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                <button className={`platform-btn ${sleepRestorative === 'Sim' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setSleepRestorative('Sim')}>Sim</button>
                <button className={`platform-btn ${sleepRestorative === 'Não' ? 'active' : ''}`} style={{padding: '10px'}} onClick={() => setSleepRestorative('Não')}>Não</button>
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="onboard-step-content fade-in">
            <h2>Mapeamento Corporal</h2>
            <p>Faça o upload de fotos em trajes de banho ou roupas íntimas para avaliação do bio-agente APOGEU.</p>
            <div className="photo-slots">
              <div className="photo-slot">
                <Camera size={24} color="var(--text-muted)" />
                <span>Frente</span>
              </div>
              <div className="photo-slot">
                <Camera size={24} color="var(--text-muted)" />
                <span>Perfil</span>
              </div>
              <div className="photo-slot">
                <Camera size={24} color="var(--text-muted)" />
                <span>Costas</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="login-wrapper">
      <ECGBackground />
      
      <div className="onboard-card glass">
        {/* Progress bar */}
        <div className="onboard-progress">
          <div 
            className="onboard-progress-fill" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
        
        <span className="step-counter">Passo {step} de {totalSteps}</span>
        
        <div className="onboard-body">
          {renderStepContent()}
        </div>

        <div className="onboard-footer">
          <button className="btn-skip" onClick={skipStep}>
            Pular etapa <SkipForward size={16} />
          </button>
          
          <button className="btn-primary" onClick={nextStep} disabled={saving}>
            {saving ? 'Salvando...' : (step === totalSteps ? 'Finalizar e Entrar' : 'Próxima Etapa')} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
