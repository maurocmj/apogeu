import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link2, RefreshCw, AlertCircle, CheckCircle, Trash2, ArrowRight } from 'lucide-react';
import './Integrations.css';

const Integrations = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

  if (loading) {
    return (
      <div className="module-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="module-container integrations-container">
      <header className="page-header">
        <h1 className="neon-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link2 size={32} color="var(--primary)" /> Integrações & Dispositivos
        </h1>
        <p>Conecte seus aplicativos de saúde e wearables ao ecossistema APOGEU</p>
      </header>

      {message.text && (
        <div className={`toast-notification ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="integrations-grid">
        {/* Card do Strava */}
        <div className={`glass integration-card hover-glow ${connection ? 'connected' : ''}`}>
          <div className="card-header-row">
            <div className="brand-badge-wrapper">
              {/* Logotipo estilizado do Strava (Laranja) */}
              <div className="brand-logo strava-logo">
                <span>strava</span>
              </div>
              <span className={`status-badge ${connection ? 'connected' : 'disconnected'}`}>
                {connection ? 'Conectado' : 'Disponível'}
              </span>
            </div>
          </div>

          <div className="card-body">
            <h3>Strava Integration</h3>
            <p>
              Sincronize automaticamente todas as suas atividades de corrida, ciclismo, musculação e treinos gerais. 
              Os dados de distância, elevação, tempo e frequência cardíaca serão consumidos diretamente pelo nosso 
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
                  <CheckCircle size={14} color="#ef4444" />
                  <span>Sincronização bidirecional de atividades aérobicas e anaeróbicas</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={14} color="#ef4444" />
                  <span>Acesso detalhado a zonas de batimento cardíaco e altimetria</span>
                </div>
                <div className="feature-item">
                  <CheckCircle size={14} color="#ef4444" />
                  <span>Cálculo automático de fadiga neuromuscular por IA</span>
                </div>
              </div>
            )}

            <div className="card-actions">
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

        {/* Placeholder para outras integrações futuras */}
        <div className="glass integration-card disabled">
          <div className="card-header-row">
            <div className="brand-badge-wrapper">
              <div className="brand-logo apple-health-logo">
                <span>Apple Health</span>
              </div>
              <span className="status-badge coming-soon">Em Breve</span>
            </div>
          </div>
          <div className="card-body">
            <h3>Apple Health / Watch</h3>
            <p>Sincronize sono, passos diários, frequência cardíaca em repouso e variabilidade (HRV) diretamente do seu Apple Watch.</p>
          </div>
        </div>

        <div className="glass integration-card disabled">
          <div className="card-header-row">
            <div className="brand-badge-wrapper">
              <div className="brand-logo garmin-logo">
                <span>Garmin</span>
              </div>
              <span className="status-badge coming-soon">Em Breve</span>
            </div>
          </div>
          <div className="card-body">
            <h3>Garmin Connect</h3>
            <p>Importe dinamicamente as métricas de performance avançada, carga de treino (Training Load) e VO2 Máx.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
