import React, { useState, useEffect } from 'react';
import { Target, Dumbbell, ChevronDown, Filter, Search, Share2, Trash2, Edit2, RefreshCw, Link2, Activity, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AgentBubbleCard from '../components/AgentBubbleCard';
import ActionPlanCard from '../components/ActionPlanCard';
import SportsRadarChart from '../components/SportsRadarChart';
import SportsScoreTimelineChart from '../components/SportsScoreTimelineChart';
import './Sports.css';

const activitiesData = [
  { id: 1, sport: 'Running', date: 'Tue, 6/2/2026', title: 'Morning Activity', time: '49:41', dist: '8.0 km', elev: '120 m', effort: 10, type: 'Workout', calories: '450 kcal' },
  { id: 2, sport: 'Running', date: 'Mon, 6/1/2026', title: 'Morning Activity', time: '51:10', dist: '8.2 km', elev: '105 m', effort: 20, type: 'Workout', calories: '480 kcal' },
  { id: 3, sport: 'Running', date: 'Sat, 5/30/2026', title: 'Long Run', time: '1:16:21', dist: '15.0 km', elev: '250 m', effort: 39, type: 'Long Run', calories: '950 kcal' },
  { id: 4, sport: 'Running', date: 'Thu, 5/28/2026', title: 'Morning Activity', time: '1:13:48', dist: '14.5 km', elev: '220 m', effort: 27, type: 'Workout', calories: '850 kcal' },
  { id: 5, sport: 'Running', date: 'Wed, 5/27/2026', title: 'Morning Activity', time: '1:14:18', dist: '14.2 km', elev: '210 m', effort: 32, type: 'Workout', calories: '820 kcal' },
  { id: 6, sport: 'Weight Training', date: 'Mon, 4/20/2026', title: 'Upper Body', time: '58:42', dist: '0 km', elev: '0 m', effort: 14, type: 'Workout', calories: '210 kcal' },
  { id: 7, sport: 'Weight Training', date: 'Sat, 4/18/2026', title: 'Lower Body', time: '48:19', dist: '0 km', elev: '0 m', effort: 7, type: 'Workout', calories: '180 kcal' },
];

const Sports = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasStrava, setHasStrava] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('Todos');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: connection } = await supabase
            .from('user_strava_tokens')
            .select('id')
            .maybeSingle();
          
          setHasStrava(!!connection);
          await fetchActivities(session.user.id);

          if (connection) {
            runBackgroundSync(session.user.id);
          }
        } else {
          setActivities(activitiesData);
        }
      } catch (err) {
        console.error('Error initializing sports page:', err);
        setActivities(activitiesData);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchActivities = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('health_events')
        .select('*')
        .eq('user_id', uid)
        .eq('event_type', 'WORKOUT_COMPLETED')
        .order('event_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const seenStravaIds = new Set();
        const formatted = [];
        
        data.forEach(event => {
          const payload = event.payload;
          const stravaId = payload.id || event.id;
          
          if (!seenStravaIds.has(stravaId)) {
            seenStravaIds.add(stravaId);
            
            const dateObj = new Date(event.event_date);
            const weekdayStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
            const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const formatTime = (secs) => {
              const hours = Math.floor(secs / 3600);
              const minutes = Math.floor((secs % 3600) / 60);
              const seconds = secs % 60;
              return hours > 0 
                ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                : `${minutes}:${seconds.toString().padStart(2, '0')}`;
            };

            const distKm = payload.distance ? `${(payload.distance / 1000).toFixed(1)} km` : '0 km';
            const elevM = payload.total_elevation_gain ? `${Math.round(payload.total_elevation_gain)} m` : '0 m';

            formatted.push({
              id: event.id,
              strava_id: stravaId,
              sport: payload.sport || payload.type || 'Workout',
              date: `${weekdayStr.toUpperCase()}, ${dateStr}`,
              title: payload.title || payload.name || 'Atividade',
              time: formatTime(payload.moving_time || 0),
              dist: distKm,
              elev: elevM,
              effort: payload.suffer_score || 0,
              calories: payload.calories ? `${Math.round(payload.calories)} kcal` : '0 kcal',
              type: payload.raw?.workout_type === 3 ? 'Competition' : 'Workout'
            });
          }
        });
        setActivities(formatted);
      } else {
        setActivities(activitiesData);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities(activitiesData);
    }
  };

  const runBackgroundSync = async (uid) => {
    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke('strava-integration/sync', {
        method: 'POST'
      });
      if (!error && data && data.syncedCount > 0) {
        await fetchActivities(uid);
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase.functions.invoke('strava-integration/sync', {
          method: 'POST'
        });
        if (error || (data && data.error)) throw new Error(error?.message || data?.error);
        await fetchActivities(session.user.id);
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
      alert(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredActivities = activities.filter(act => {
    const matchesSearch = act.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          act.sport.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = selectedSport === 'Todos' || act.sport === selectedSport;
    return matchesSearch && matchesSport;
  });

  if (loading) {
    return (
      <div className="home-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader" style={{ borderTopColor: '#fc4c02' }}></div>
      </div>
    );
  }

  return (
    <div className="home-container" style={{ padding: 0, gridTemplateColumns: '450px 1fr', alignItems: 'stretch', marginTop: '24px' }}>
      
      {/* Coluna da Esquerda: Radar e Visão Geral */}
      <main className="home-main-col feed-card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '20px' }}>
        <div>
          <div className="feed-header" style={{ marginBottom: '16px' }}>
            <h3>Radar de Performance</h3>
            <span className="badge" style={{ background: 'rgba(252, 76, 2, 0.12)', color: '#fc4c02', border: '1px solid rgba(252, 76, 2, 0.25)' }}>Strava Sync</span>
          </div>
          <div className="radar-chart-wrapper" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
            <div style={{ width: '100%', maxWidth: '380px' }}>
              <SportsRadarChart activities={activities} />
            </div>
          </div>
        </div>

        {/* Resumo Integrado */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
          paddingTop: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(252, 76, 2, 0.5)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Última Atividade</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{activities.length > 0 ? activities[0].date.split(',')[1] : '-'}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(59, 130, 246, 0.5)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Volume</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{activities.length} Atividades</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '2px solid rgba(16, 185, 129, 0.5)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Foco</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>Endurance</span>
          </div>
        </div>
      </main>

      {/* Coluna da Direita: Gráfico de Timeline */}
      <aside className="home-right-col feed-card glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className="feed-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Histórico de Carga</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Carga de Treino vs Volume Semanal</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="badge" style={{ background: 'rgba(252, 76, 2, 0.12)', color: '#fc4c02', border: '1px solid rgba(252, 76, 2, 0.25)', fontWeight: '700', fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}>
              Pico de Forma
            </span>
          </div>
        </div>
        <SportsScoreTimelineChart activities={activities} />
      </aside>

      {/* Protocolo e Chat Widget (Laranja #fc4c02) */}
      <section style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '24px', marginBottom: '8px' }}>
        <div>
          <ActionPlanCard 
            title="Plano de Treino"
            icon={Target}
            color="#fc4c02"
            items={[
              "Hoje: Descanso Ativo (Caminhada leve ou Yoga)",
              "Amanhã: Treino de Força (Membros Inferiores)",
              "Sábado: Long Run (15km) em ritmo constante"
            ]}
          />
        </div>
        <div>
          <AgentBubbleCard 
            agentId="personal"
            agentName="Personal Agent" 
            icon={Dumbbell} 
            agentColor="#fc4c02" 
            message="Notei que sua carga de treino subiu 20% essa semana comparado à passada. Como está se sentindo? Recomendo focar em descanso e hidratação hoje para evitar fadiga neuromuscular." 
          />
        </div>
      </section>

      {/* Connect Strava Banner se não tiver Strava */}
      {!hasStrava && (
        <section style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
          <div className="glass hover-glow" style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid #fc4c02',
            background: 'rgba(252, 76, 2, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                background: 'rgba(252, 76, 2, 0.1)',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Link2 size={20} color="#fc4c02" />
              </div>
              <div>
                <strong style={{ color: '#fff', fontSize: '15px' }}>Conecte seu Strava</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px', marginBottom: 0 }}>
                  Importe automaticamente distância, ritmo e frequência cardíaca das suas corridas e treinos.
                </p>
              </div>
            </div>
            <Link 
              to="/integracoes" 
              style={{
                background: '#fc4c02',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              Conectar
            </Link>
          </div>
        </section>
      )}

      {/* Histórico de Atividades Table */}
      <section style={{ gridColumn: '1 / -1', marginTop: '16px', marginBottom: '32px' }}>
        <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity color="#fc4c02" size={20} /> Histórico de Atividades
            </h3>
            
            {hasStrava && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="btn-primary" 
                  style={{ height: '36px', padding: '0 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(252, 76, 2, 0.1)', border: '1px solid #fc4c02', color: '#fc4c02' }}
                >
                  <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Strava'}
                </button>
              </div>
            )}
          </div>
          
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '16px' }}>
             <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '6px', color: 'white', fontSize: '13px', width: '250px' }} />
             <select value={selectedSport} onChange={e=>setSelectedSport(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '6px', color: 'white', fontSize: '13px' }}>
               <option value="Todos">Todos os Esportes</option>
               <option value="Running">Running</option>
               <option value="Cycling">Cycling</option>
               <option value="Weight Training">Weight Training</option>
               <option value="Workout">Workout</option>
             </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Esporte</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Data</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Título</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Tempo</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Distância</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Calorias</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500' }}>Esforço</th>
                  <th style={{ padding: '16px 24px', fontWeight: '500', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma atividade encontrada.</td>
                  </tr>
                )}
                {filteredActivities.map(act => (
                  <tr 
                    key={act.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.3s ease', cursor: 'pointer' }} 
                    className="hover-glow"
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: 'white', fontSize: '13px' }}>{act.sport}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{act.date}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{act.title}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{act.time}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{act.dist}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{act.calories}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>{act.effort}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                        <Link2 size={16} color="var(--text-muted)" style={{cursor:'pointer'}} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Sports;
