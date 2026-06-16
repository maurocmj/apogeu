import React, { useState, useEffect } from 'react';
import { Target, Dumbbell, ChevronDown, Filter, Search, Share2, Trash2, Edit2, RefreshCw, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ChatWidget from '../components/ChatWidget';
import ActionPlanCard from '../components/ActionPlanCard';
import TrainingSpreadsheet from '../components/TrainingSpreadsheet';
import './Sports.css';

const activitiesData = [
  { id: 1, sport: 'Running', date: 'Tue, 6/2/2026', title: 'Morning Activity', time: '49:41', dist: '8.0 km', elev: '120 m', effort: 10, type: 'Workout' },
  { id: 2, sport: 'Running', date: 'Mon, 6/1/2026', title: 'Morning Activity', time: '51:10', dist: '8.2 km', elev: '105 m', effort: 20, type: 'Workout' },
  { id: 3, sport: 'Running', date: 'Sat, 5/30/2026', title: 'Long Run', time: '1:16:21', dist: '15.0 km', elev: '250 m', effort: 39, type: 'Long Run' },
  { id: 4, sport: 'Running', date: 'Thu, 5/28/2026', title: 'Morning Activity', time: '1:13:48', dist: '14.5 km', elev: '220 m', effort: 27, type: 'Workout' },
  { id: 5, sport: 'Running', date: 'Wed, 5/27/2026', title: 'Morning Activity', time: '1:14:18', dist: '14.2 km', elev: '210 m', effort: 32, type: 'Workout' },
  { id: 6, sport: 'Weight Training', date: 'Mon, 4/20/2026', title: 'Upper Body', time: '58:42', dist: '0 km', elev: '0 m', effort: 14, type: 'Workout' },
  { id: 7, sport: 'Weight Training', date: 'Sat, 4/18/2026', title: 'Lower Body', time: '48:19', dist: '0 km', elev: '0 m', effort: 7, type: 'Workout' },
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
        const formatted = data.map(event => {
          const payload = event.payload;
          
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

          return {
            id: event.id,
            sport: payload.sport || 'Workout',
            date: `${weekdayStr.toUpperCase()}, ${dateStr}`,
            title: payload.title || 'Atividade',
            time: formatTime(payload.moving_time || 0),
            dist: distKm,
            elev: elevM,
            effort: payload.suffer_score || 0,
            type: payload.raw?.workout_type === 3 ? 'Competition' : 'Workout'
          };
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
      <div className="module-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader" style={{ borderTopColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="sports-container">
      <main className="sports-main">
        <div className="sports-header-row">
          <div className="sports-tabs">
            <button className="tab active">Minhas Atividades</button>
            <button className="tab">Excluídos Recentemente</button>
          </div>
        </div>

        {!hasStrava && (
          <div className="glass hover-glow" style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
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
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
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
              Conectar Dispositivo
            </Link>
          </div>
        )}

        <div className="sports-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Minhas Atividades</h2>
          {hasStrava && (
            <button 
              className="btn-sync" 
              onClick={handleManualSync}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#3b82f6',
                fontWeight: '600'
              }}
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Strava'}
            </button>
          )}
        </div>

        <div className="sports-filters glass">
          <div className="filter-group">
            <label>Palavras-chave</label>
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Ex: Corrida Matinal" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn-search">Pesquisar</button>
            </div>
            <div className="checkbox-wrap mt-8">
              <input type="checkbox" id="private" />
              <label htmlFor="private">Privado</label>
            </div>
          </div>
          
          <div className="filter-group">
            <label>Esporte</label>
            <div className="select-box" style={{ position: 'relative' }}>
              <select 
                value={selectedSport} 
                onChange={(e) => setSelectedSport(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  width: '100%',
                  paddingRight: '20px',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none'
                }}
              >
                <option value="Todos" style={{ background: '#161920' }}>Todos os Esportes</option>
                <option value="Running" style={{ background: '#161920' }}>Running</option>
                <option value="Cycling" style={{ background: '#161920' }}>Cycling</option>
                <option value="Weight Training" style={{ background: '#161920' }}>Weight Training</option>
                <option value="Workout" style={{ background: '#161920' }}>Workout</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '0', top: '2px', pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="tags-group">
            <label>Tags de Atividade</label>
            <div className="tags-checkboxes">
              {['Race', 'Workout', 'Long Run', 'Commute', 'For a Cause', 'Recovery', 'With Kid', 'With Pet', 'Competition'].map(tag => (
                <div key={tag} className="checkbox-wrap">
                  <input type="checkbox" id={`tag-${tag}`} />
                  <label htmlFor={`tag-${tag}`}>{tag}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="activities-list-container glass">
          <div className="activities-count">{filteredActivities.length} Atividades</div>
          <div className="table-wrapper">
            <table className="activities-table">
              <thead>
                <tr>
                  <th>Esporte</th>
                  <th>Data <ChevronDown size={14} /></th>
                  <th>Título <ChevronDown size={14} /></th>
                  <th>Tempo <ChevronDown size={14} /></th>
                  <th>Distância <ChevronDown size={14} /></th>
                  <th>Elevação <ChevronDown size={14} /></th>
                  <th>Esforço Relativo <ChevronDown size={14} /></th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map(act => (
                  <tr key={act.id}>
                    <td>
                      <div className="sport-col">
                        <span className="sport-name">{act.sport}</span>
                      </div>
                    </td>
                    <td>{act.date}</td>
                    <td><a href="#" className="activity-link">{act.title}</a></td>
                    <td>{act.time}</td>
                    <td>{act.dist}</td>
                    <td>{act.elev}</td>
                    <td>{act.effort}</td>
                    <td className="actions-col">
                      <button className="btn-action">Editar</button>
                      <button className="btn-action">Excluir</button>
                      <button className="btn-action dropdown">Share <ChevronDown size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Planilha Detalhada */}
        <TrainingSpreadsheet />
      </main>

      <aside className="sports-sidebar">
        <ChatWidget 
          agentName="Personal Agent" 
          icon={Dumbbell} 
          agentColor="#ef4444" 
          initialMessage="Vi que ontem você fez um 'Long Run' de 15km. O recomendado hoje é focar em 'Recovery' ou descanso total. Como está se sentindo?" 
        />

        <div className="agent-tip-card glass goal" style={{ marginTop: '24px' }}>
          <div className="agent-tip-icon"><Target size={20} /></div>
          <div className="agent-tip-content">
            <strong>Meta: Maratona 10km</strong>
            <p>Seu volume semanal de corrida atingiu 30km. Continue assim e chegará no seu objetivo com folga!</p>
            <div className="progress-bar-mini" style={{ marginTop: '8px' }}>
              <div className="progress-fill-mini" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <ActionPlanCard 
            title="Ciclo de Treino Atual"
            icon={Target}
            color="#ef4444"
            items={[
              "Hoje: Descanso Ativo (Caminhada leve)",
              "Amanhã: Treino de Força (Superiores)",
              "Sábado: Long Run (18km)"
            ]}
          />
        </div>
      </aside>
    </div>
  );
};

export default Sports;
