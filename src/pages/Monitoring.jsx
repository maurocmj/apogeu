import { useState, useEffect } from 'react';
import { Smile, Frown, Meh, Moon, Activity, Brain, Target, Loader2, Sparkles, CheckCircle, AlertCircle, Heart } from 'lucide-react';
import { AreaChart, Area, ComposedChart, Bar, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import AgentBubbleCard from '../components/AgentBubbleCard';
import ActionPlanCard from '../components/ActionPlanCard';

const Monitoring = () => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form States
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState(80);
  const [stressLevel, setStressLevel] = useState(30);
  const [selectedMood, setSelectedMood] = useState('Bem / Disposto');
  const [notes, setNotes] = useState('');

  // Charts State
  const [sleepHistory, setSleepHistory] = useState([]);
  const [stressHistory, setStressHistory] = useState([]);
  const [heartRateHistory, setHeartRateHistory] = useState([]);
  const [todayHeartRateAvg, setTodayHeartRateAvg] = useState(null);
  const [todayHeartRateMin, setTodayHeartRateMin] = useState(null);
  const [todayHeartRateMax, setTodayHeartRateMax] = useState(null);
  const [todayIsSynced, setTodayIsSynced] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        fetchHabitsHistory(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function fetchHabitsHistory(uid) {
    try {
      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: true });

      if (error) throw error;

      // Generate base days for the last 7 days
      const baseDays = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const capitalizedLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
        baseDays.push({
          date: dateStr,
          day: capitalizedLabel,
          sleep_quality: 0,
          sleep_hours: 0,
          stress_level: 0
        });
      }

      // Merge database data
      const mergedSleep = [];
      const mergedStress = [];
      const mergedHeart = [];
      
      const todayStr = new Date().toISOString().split('T')[0];

      baseDays.forEach(item => {
        const dbRecord = data?.find(r => r.date === item.date);

        if (dbRecord && dbRecord.metrics) {
          mergedSleep.push({
            day: item.day,
            score: dbRecord.metrics.sleep_quality ?? null,
            hours: dbRecord.metrics.sleep_hours ?? null
          });
          mergedStress.push({
            day: item.day,
            level: dbRecord.metrics.stress_level ?? null
          });
          mergedHeart.push({
            day: item.day,
            avg: dbRecord.metrics.heart_rate_avg ?? null,
            min: dbRecord.metrics.heart_rate_min ?? null,
            max: dbRecord.metrics.heart_rate_max ?? null,
            range: (dbRecord.metrics.heart_rate_min && dbRecord.metrics.heart_rate_max)
              ? [dbRecord.metrics.heart_rate_min, dbRecord.metrics.heart_rate_max]
              : null
          });
          
          // Pre-populate form if it's today's date
          if (item.date === todayStr) {
            setSleepHours(dbRecord.metrics.sleep_hours || 8);
            setSleepQuality(dbRecord.metrics.sleep_quality || 80);
            setStressLevel(dbRecord.metrics.stress_level || 30);
            setSelectedMood(dbRecord.metrics.mood || 'Bem / Disposto');
            setNotes(dbRecord.metrics.notes || '');
            setTodayHeartRateAvg(dbRecord.metrics.heart_rate_avg || null);
            setTodayHeartRateMin(dbRecord.metrics.heart_rate_min || null);
            setTodayHeartRateMax(dbRecord.metrics.heart_rate_max || null);
            setTodayIsSynced(dbRecord.metrics.sync_source === 'google_health_connect');
            setHasLoggedToday(true);
          }
        } else {
          // Bring only real data: set to null if no DB record exists
          mergedSleep.push({
            day: item.day,
            score: null,
            hours: null
          });
          mergedStress.push({
            day: item.day,
            level: null
          });
          mergedHeart.push({
            day: item.day,
            avg: null,
            min: null,
            max: null,
            range: null
          });
        }
      });

      setSleepHistory(mergedSleep);
      setStressHistory(mergedStress);
      setHeartRateHistory(mergedHeart);

    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // 1. Fetch current record for today to merge metrics JSONB
      const { data: existingRec, error: fetchError } = await supabase
        .from('daily_habits')
        .select('metrics')
        .eq('user_id', userId)
        .eq('date', todayStr)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const existingMetrics = existingRec?.metrics || {};

      // 2. Merge existing metrics with manual inputs (preserving synced heart rate/sources)
      const mergedMetrics = {
        ...existingMetrics,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        mood: selectedMood,
        notes: notes
      };

      const { error } = await supabase
        .from('daily_habits')
        .upsert({
          user_id: userId,
          date: todayStr,
          metrics: mergedMetrics
        }, { onConflict: 'user_id, date' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Métricas de hoje registradas com sucesso!' });
      setHasLoggedToday(true);
      fetchHabitsHistory(userId); // refresh charts!
      
      // Auto-dismiss toast
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);

    } catch (err) {
      console.error("Erro ao registrar métricas:", err);
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="module-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  // Get active status values
  const displaySleepScore = hasLoggedToday ? sleepQuality : '--';
  const displaySleepText = hasLoggedToday ? `Duração: ${sleepHours}h` : 'Registros pendentes';
  const displayStressLevel = hasLoggedToday ? (stressLevel <= 30 ? 'Relaxado' : stressLevel <= 70 ? 'Moderado' : 'Alto') : 'Pendente';
  const displayStressText = hasLoggedToday ? `Fadiga atual de ${stressLevel}%` : 'HRV não registrado';

  return (
    <div className="module-container">
      {message.text && (
        <div className={`toast-notification ${message.type}`} style={{ marginBottom: '24px' }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Hardware data */}
        <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '16px', fontWeight: '500' }}>
                <Moon size={20} /> Qualidade do Sono
              </h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                <span className="display-number neon-text" style={{ fontSize: '32px', lineHeight: '1' }}>{displaySleepScore}</span>
                <span style={{ color: 'var(--text-muted)', paddingBottom: '4px', fontSize: '14px' }}>/ 100</span>
              </div>
            </div>
            
            <div style={{ height: '120px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sleepHistory} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  {/* Dual Y-Axis */}
                  <YAxis yAxisId="left" hide={true} domain={['dataMin - 10', 'dataMax + 10']} />
                  <YAxis yAxisId="right" hide={true} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} 
                    formatter={(value, name) => {
                      if (value === null || value === undefined) return ['Sem registro', name];
                      if (name === 'Qualidade') return [`${value} pts`, name];
                      if (name === 'Duração') return [`${value}h`, name];
                      return [value, name];
                    }}
                  />
                  {/* Sleep Quality Area (left Y-axis) */}
                  <Area yAxisId="left" name="Qualidade" type="monotone" dataKey="score" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSleep)" strokeWidth={3} connectNulls={true} dot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  {/* Sleep Hours Line (right Y-axis) */}
                  <Line yAxisId="right" name="Duração" type="monotone" dataKey="hours" stroke="#00e5ff" strokeWidth={2} connectNulls={true} dot={{ r: 5, fill: '#00e5ff', stroke: '#ffffff', strokeWidth: 1.5 }} activeDot={{ r: 7 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {displaySleepText}. {hasLoggedToday && sleepQuality >= 80 ? 'Recuperação profunda adequada. Fase REM ideal.' : ''}
              </span>
              {hasLoggedToday && todayIsSynced && (
                <span style={{ fontSize: '11px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={10} /> Health Connect
                </span>
              )}
            </p>
          </div>

          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '16px', fontWeight: '500' }}>
                <Activity size={20} /> Nível de Stress (HRV)
              </h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                <span className="display-number neon-text" style={{ fontSize: '24px', lineHeight: '1', color: hasLoggedToday && stressLevel <= 30 ? '#10b981' : hasLoggedToday && stressLevel <= 70 ? '#f59e0b' : hasLoggedToday ? '#ef4444' : 'var(--text-muted)' }}>
                  {displayStressLevel}
                </span>
              </div>
            </div>

            <div style={{ height: '120px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stressHistory} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide={true} domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#10b981' }} 
                    formatter={(value) => {
                      if (value === null || value === undefined) return ['Sem registro', 'Estresse'];
                      return [`${value}%`, 'Estresse'];
                    }}
                  />
                  <Area type="monotone" dataKey="level" stroke="#10b981" fillOpacity={1} fill="url(#colorStress)" strokeWidth={2} connectNulls={true} dot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {displayStressText}. {hasLoggedToday && stressLevel <= 30 ? 'Variação da frequência cardíaca estável. Boa adaptação neuromuscular.' : ''}
              </span>
              {hasLoggedToday && todayIsSynced && (
                <span style={{ fontSize: '11px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={10} /> Health Connect
                </span>
              )}
            </p>
          </div>

          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '16px', fontWeight: '500' }}>
                <Heart size={20} color="#ef4444" /> Frequência Cardíaca
              </h3>
              <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                <span className="display-number neon-text" style={{ fontSize: '32px', lineHeight: '1', color: '#ef4444' }}>
                  {hasLoggedToday && todayHeartRateAvg ? `${todayHeartRateAvg}` : '--'}
                </span>
                <span style={{ color: 'var(--text-muted)', paddingBottom: '4px', fontSize: '14px' }}>BPM (Médio)</span>
              </div>
            </div>
            
            <div style={{ height: '120px', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={heartRateHistory} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide={true} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} 
                    formatter={(value, name) => {
                      if (value === null || value === undefined) return ['Sem registro', name];
                      return [`${value} bpm`, name];
                    }}
                  />
                  {/* Maximum heart rate line (crimson red) */}
                  <Line type="monotone" dataKey="max" name="Máximo" stroke="#be123c" strokeOpacity={0.8} strokeWidth={1.5} connectNulls={true} dot={{ r: 4, fill: '#be123c', stroke: '#ffffff', strokeWidth: 1.5 }} />
                  {/* Average heart rate line (solid red) */}
                  <Line type="monotone" dataKey="avg" name="Média" stroke="#ef4444" strokeWidth={3} connectNulls={true} dot={{ r: 6, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  {/* Minimum heart rate line (light red/rose) */}
                  <Line type="monotone" dataKey="min" name="Mínimo" stroke="#fda4af" strokeOpacity={0.8} strokeWidth={1.5} connectNulls={true} dot={{ r: 4, fill: '#fda4af', stroke: '#ffffff', strokeWidth: 1.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {hasLoggedToday && todayHeartRateAvg 
                  ? `Mín: ${todayHeartRateMin} bpm · Máx: ${todayHeartRateMax} bpm` 
                  : 'Registros pendentes'}
              </span>
              {hasLoggedToday && todayIsSynced && (
                <span style={{ fontSize: '11px', background: 'rgba(0, 229, 255, 0.1)', color: '#00e5ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={10} /> Health Connect
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Sensations input (Interactive logging form) */}
        <div className="glass" style={{ flex: '1 1 300px', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ color: 'var(--primary)', margin: 0, fontSize: '18px' }}>Registro de Hoje</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Como você se sente?</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setSelectedMood('Bem / Disposto')}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedMood === 'Bem / Disposto' ? '1px solid #10b981' : '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: selectedMood === 'Bem / Disposto' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                  color: selectedMood === 'Bem / Disposto' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Smile color="#10b981" size={24} />
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Disposto</span>
              </button>
              
              <button 
                type="button"
                onClick={() => setSelectedMood('Cansaço')}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedMood === 'Cansaço' ? '1px solid #f59e0b' : '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: selectedMood === 'Cansaço' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.02)',
                  color: selectedMood === 'Cansaço' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Meh color="#f59e0b" size={24} />
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Cansaço</span>
              </button>

              <button 
                type="button"
                onClick={() => setSelectedMood('Dores')}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedMood === 'Dores' ? '1px solid #ef4444' : '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: selectedMood === 'Dores' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                  color: selectedMood === 'Dores' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Frown color="#ef4444" size={24} />
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Dores</span>
              </button>

              <button 
                type="button"
                onClick={() => setSelectedMood('Fadiga Mental')}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedMood === 'Fadiga Mental' ? '1px solid #8b5cf6' : '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: selectedMood === 'Fadiga Mental' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                  color: selectedMood === 'Fadiga Mental' ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Moon color="#8b5cf6" size={24} />
                <span style={{ fontSize: '11px', fontWeight: '500' }}>Fadiga Mental</span>
              </button>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Horas de Sono:</span>
                <strong style={{ color: '#8b5cf6' }}>{sleepHours}h</strong>
              </div>
              <input 
                type="range" min="0" max="12" step="0.5" 
                value={sleepHours} 
                onChange={e => setSleepHours(parseFloat(e.target.value))}
                style={{ accentColor: '#8b5cf6', width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Qualidade do Sono:</span>
                <strong style={{ color: '#8b5cf6' }}>{sleepQuality}%</strong>
              </div>
              <input 
                type="range" min="0" max="100" step="5" 
                value={sleepQuality} 
                onChange={e => setSleepQuality(parseInt(e.target.value))}
                style={{ accentColor: '#8b5cf6', width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nível de Estresse:</span>
                <strong style={{ color: '#10b981' }}>{stressLevel}%</strong>
              </div>
              <input 
                type="range" min="0" max="100" step="5" 
                value={stressLevel} 
                onChange={e => setStressLevel(parseInt(e.target.value))}
                style={{ accentColor: '#10b981', width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Anotações adicionais</span>
            <textarea 
              placeholder="Ex: Dor leve no joelho pós-corrida..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '13px', minHeight: '80px', resize: 'none' }}
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={saving || !userId}
            className="btn-primary neon-border" 
            style={{ width: '100%', padding: '12px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {saving ? 'Registrando...' : 'Registrar Dia'}
          </button>
        </div>

        {/* Mind Agent Chat & Plan */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AgentBubbleCard 
            agentId="mind"
            agentName="Mind Agent" 
            icon={Brain} 
            agentColor="#8b5cf6" 
            message="Sua fase de sono profundo não foi ideal na noite passada. Sabendo que você tem treino pesado hoje, recomendo um cochilo de 20 min à tarde se possível." 
          />

          <ActionPlanCard 
            title="Protocolo de Recuperação"
            icon={Target}
            color="#8b5cf6"
            items={[
              "Dormir impreterivelmente às 22h30",
              "Fazer 15 min de meditação guiada antes de deitar",
              "Evitar telas 1h antes do sono"
            ]}
          />
        </div>

      </div>
    </div>
  );
};

export default Monitoring;
