import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link2, RefreshCw, AlertCircle, CheckCircle, Trash2, ArrowRight, Activity, Moon } from 'lucide-react';
import './Integrations.css';

const Integrations = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingHC, setSyncingHC] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connection, setConnection] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userId, setUserId] = useState(null);


  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      setUserId(session.user.id);

      // Query local table (faster and respects RLS)
      const { data, error } = await supabase
        .from('user_strava_tokens')
        .select('created_at, updated_at, strava_athlete_id')
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (err) {
      console.error('Error fetching connection status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
    if (!clientId) {
      setMessage({ 
        type: 'error', 
        text: 'VITE_STRAVA_CLIENT_ID não está configurado no arquivo .env.local. Por favor, leia as instruções no arquivo strava_setup_instructions.md' 
      });
      return;
    }

    const redirectUri = `${window.location.origin}/integracoes/callback`;
    const scope = 'activity:read_all';
    
    // Redirect to Strava OAuth
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase.functions.invoke('strava-integration/sync', {
        method: 'POST'
      });

      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao sincronizar');
      }

      setMessage({ 
        type: 'success', 
        text: `Sincronização concluída! ${data.syncedCount} novos treinos importados, ${data.skippedCount} duplicados ignorados.` 
      });
      fetchConnectionStatus();
    } catch (err) {
      console.error('Error syncing:', err);
      setMessage({ type: 'error', text: `Falha na sincronização: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o Strava? Seus dados sincronizados não serão apagados, mas novas atividades não serão importadas.')) {
      return;
    }
    
    setDisconnecting(true);
    setMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase.functions.invoke('strava-integration/disconnect', {
        method: 'POST'
      });

      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao desconectar');
      }

      setConnection(null);
      setMessage({ type: 'success', text: 'Conta do Strava desconectada com sucesso.' });
    } catch (err) {
      console.error('Error disconnecting:', err);
      setMessage({ type: 'error', text: `Falha ao desconectar: ${err.message}` });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSimulateHealthConnect = async () => {
    setSyncingHC(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado.');
      }

      // Generate random high-quality metrics
      // Sleep: hours between 7.0 and 8.8, quality between 78 and 96
      // Stress: level between 15 and 35 (low stress)
      const sleepHours = parseFloat((7.0 + Math.random() * 1.8).toFixed(1));
      const sleepQuality = Math.floor(78 + Math.random() * 18);
      const stressLevel = Math.floor(15 + Math.random() * 20);
      const moods = ['Bem / Disposto', 'Excelente / Produtivo'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      
      const payload = {
        date: new Date().toISOString().split('T')[0],
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        mood: randomMood,
        notes: 'Sincronizado automaticamente via Google Health Connect (Simulação).'
      };

      const { data, error } = await supabase.functions.invoke('health-connect-sync', {
        method: 'POST',
        body: payload
      });

      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || 'Erro ao sincronizar');
      }

      setMessage({
        type: 'success',
        text: `Health Connect: Dados de sono (${sleepHours}h, ${sleepQuality}%) e estresse (${stressLevel}%) sincronizados com sucesso!`
      });
    } catch (err) {
      console.error('Error syncing Google Health Connect:', err);
      setMessage({ type: 'error', text: `Falha ao simular sincronização do Health Connect: ${err.message}` });
    } finally {
      setSyncingHC(false);
    }
  };

  if (loading) {
    return (
      <div className="module-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="module-container integrations-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60vh', padding: '24px 0' }}>
      
      <header className="page-header" style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 className="neon-text">Integrações</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '8px', fontWeight: '400' }}>
          Conecte seus aplicativos e dispositivos de saúde favoritos ao Holos
        </p>
      </header>

      {message.text && (
        <div className={`toast-notification ${message.type}`} style={{ marginBottom: '24px', width: '100%', maxWidth: '850px' }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="integrations-grid" style={{ width: '100%', maxWidth: '850px' }}>
        {/* Card do Strava */}
        <div className={`glass integration-card hover-glow ${connection ? 'connected' : ''}`} style={{ margin: 0 }}>
          <div className="card-header-row">
            <div className="brand-badge-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 16 16" width="24" height="24" fill="#fc4c02" style={{ display: 'block' }}>
                  <path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z"/>
                </svg>
                <span className="brand-logo strava-logo" style={{ fontSize: '18px', marginTop: '2px' }}>strava</span>
              </div>
              <span className={`status-badge ${connection ? 'connected' : 'disconnected'}`}>
                {connection ? 'Conectado' : 'Disponível'}
              </span>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3>Strava</h3>
            <p>
              Sincronize automaticamente todas as suas atividades de corrida, ciclismo, musculação e treinos gerais. 
              Os dados serão consumidos diretamente pelo nosso 
              <strong> Personal Agent IA</strong> para refinar suas metas de treino e descanso.
            </p>

            {connection ? (
              <div className="connection-details">
                <div className="detail-row">
                  <span className="label">Atleta ID no Strava:</span>
                  <span className="value">{connection.strava_athlete_id || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Conectado em:</span>
                  <span className="value">{new Date(connection.created_at).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Último Sync:</span>
                  <span className="value">{new Date(connection.updated_at).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="features-list">
                <div className="feature-item">
                  <CheckCircle size={14} color="#fc4c02" />
                  <span>Sincronização automática de treinos</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={14} color="#fc4c02" />
                  <span>Cálculo automático de fadiga neuromuscular por IA</span>
                </div>
              </div>
            )}

            <div className="card-actions" style={{ marginTop: 'auto' }}>
              {connection ? (
                <>
                  <button 
                    className="btn-sync" 
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    <RefreshCw size={18} className={syncing ? 'spin' : ''} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                  <button 
                    className="btn-disconnect" 
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    <Trash2 size={18} />
                    {disconnecting ? 'Desconectando...' : 'Desconectar'}
                  </button>
                </>
              ) : (
                <button className="btn-connect-strava" onClick={handleConnect}>
                  Conectar Conta Strava <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card do Google Health Connect */}
        <div className="glass integration-card hover-glow connected" style={{ margin: 0 }}>
          <div className="card-header-row">
            <div className="brand-badge-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" style={{ display: 'block' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.3-4.74 3.3-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="brand-logo" style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>Google Health</span>
              </div>
              <span className="status-badge connected">
                Ativo
              </span>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3>Google Health Connect</h3>
            <p>
              Sincronize automaticamente seus dados de sono (duração e qualidade) e níveis de estresse diários (HRV). 
              Os dados são importados do <strong>Samsung Health</strong> ou outro app compatível em segundo plano via webhook.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <Moon size={14} color="#34a853" />
                <span>Qualidade e duração do sono profunda</span>
              </div>
              <div className="feature-item">
                <Activity size={14} color="#34a853" />
                <span>Níveis de estresse diários baseados em HRV</span>
              </div>
              <div className="feature-item">
                <CheckCircle size={14} color="#34a853" />
                <span>Integração de múltiplos sensores de saúde</span>
              </div>
            </div>

            <div className="card-actions" style={{ marginTop: 'auto' }}>
              <button 
                className="btn-connect-health-connect" 
                onClick={handleSimulateHealthConnect}
                disabled={syncingHC}
              >
                <RefreshCw size={18} className={syncingHC ? 'spin' : ''} />
                {syncingHC ? 'Sincronizando...' : 'Simular Sincronização'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
