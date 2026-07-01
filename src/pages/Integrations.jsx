import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link2, RefreshCw, AlertCircle, CheckCircle, Trash2, ArrowRight, Activity, Moon, X, Copy } from 'lucide-react';
import './Integrations.css';

const Integrations = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingHC, setSyncingHC] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connection, setConnection] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userId, setUserId] = useState(null);
  const [showRealSyncModal, setShowRealSyncModal] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [healthSyncToken, setHealthSyncToken] = useState('');
  const [garminConnected, setGarminConnected] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);


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

      // Fetch health_sync_token and garmin token from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('health_sync_token, garmin_access_token')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profileError && profile) {
        setHealthSyncToken(profile.health_sync_token || '');
        setGarminConnected(!!profile.garmin_access_token);
      }
    } catch (err) {
      console.error('Error fetching connection status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRotateSyncToken = async () => {
    if (!window.confirm('Tem certeza que deseja gerar um novo token? A sincronização no seu celular parará de funcionar imediatamente até que você configure o novo token lá.')) {
      return;
    }
    
    setRotatingToken(true);
    try {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from('profiles')
        .update({ health_sync_token: newToken })
        .eq('id', userId);

      if (error) throw error;

      setHealthSyncToken(newToken);
      alert('Novo token gerado com sucesso! Lembre-se de atualizá-lo no seu celular.');
    } catch (err) {
      console.error('Error rotating sync token:', err);
      alert(`Falha ao gerar novo token: ${err.message}`);
    } finally {
      setRotatingToken(false);
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

  const handleConnectGarmin = async () => {
    setMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase.functions.invoke('garmin-auth', {
        method: 'GET'
      });
      
      if (error || !data?.url) {
        throw new Error(error?.message || 'Falha ao gerar URL de autorização da Garmin');
      }
      
      window.location.href = data.url;
    } catch (err) {
      console.error('Error connecting Garmin:', err);
      setMessage({ type: 'error', text: `Erro ao conectar Garmin: ${err.message}` });
    }
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

  const handleOpenRealSyncModal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionToken(session.access_token);
        setShowRealSyncModal(true);
      } else {
        setMessage({ type: 'error', text: 'Usuário não autenticado. Por favor, faça login novamente.' });
      }
    } catch (err) {
      console.error('Error opening real sync modal:', err);
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
          Conecte seus aplicativos e dispositivos de saúde favoritos ao Apogeu
        </p>
      </header>

      {message.text && (
        <div className={`toast-notification ${message.type}`} style={{ marginBottom: '24px', width: '100%', maxWidth: '1200px' }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="integrations-grid" style={{ width: '100%', maxWidth: '1200px' }}>
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

        {/* Card do Health Connect Webhook */}
        <div className="glass integration-card hover-glow connected" style={{ margin: 0 }}>
          <div className="card-header-row">
            <div className="brand-badge-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="30 35 48 30" width="28" height="24" style={{ display: 'block' }}>
                  <path
                    fill="#34A853"
                    fillRule="nonZero"
                    d="M65.3,45.828l3.8,-6.6c0.2,-0.4 0.1,-0.9 -0.3,-1.1c-0.4,-0.2 -0.9,-0.1 -1.1,0.3l-3.9,6.7c-6.3,-2.8 -13.4,-2.8 -19.7,0l-3.9,-6.7c-0.2,-0.4 -0.7,-0.5 -1.1,-0.3C38.8,38.328 38.7,38.828 38.9,39.228l3.8,6.6C36.2,49.428 31.7,56.028 31,63.928h46C76.3,56.028 71.8,49.428 65.3,45.828zM43.4,57.328c-0.8,0 -1.5,-0.5 -1.8,-1.2c-0.3,-0.7 -0.1,-1.5 0.4,-2.1c0.5,-0.5 1.4,-0.4 2.1,-0.4c0.7,0.3 1.2,1 1.2,1.8C45.3,56.528 44.5,57.328 43.4,57.328L43.4,57.328zM64.6,57.328c-0.8,0 -1.5,-0.5 -1.8,-1.2s-0.1,-1.5 0.4,-2.1c0.5,-0.5 1.4,-0.4 2.1,-0.4c0.7,0.3 1.2,1 1.2,1.8C66.5,56.528 65.6,57.328 64.6,57.328L64.6,57.328z"
                  />
                </svg>
                <span className="brand-logo" style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>HC Webhook</span>
              </div>
              <span className="status-badge connected">
                Ativo
              </span>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <p>
              Sincronize automaticamente seus dados de sono (duração e qualidade) e níveis de estresse diários (HRV). 
              Os dados são importados do <strong>Samsung Health</strong> ou outro app compatível em segundo plano usando o aplicativo Health Connect Webhook.
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

            <div className="card-actions" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn-connect-health-connect" 
                onClick={handleSimulateHealthConnect}
                disabled={syncingHC}
              >
                <RefreshCw size={18} className={syncingHC ? 'spin' : ''} />
                {syncingHC ? 'Sincronizando...' : 'Simular Sincronização'}
              </button>

              <button 
                type="button"
                className="btn-sync" 
                onClick={handleOpenRealSyncModal}
                style={{ width: '100%', padding: '12px 20px', borderRadius: '12px' }}
              >
                Configurar Sincronização Real
              </button>
            </div>
          </div>
        </div>

        {/* Card do Garmin */}
        <div className={`glass integration-card hover-glow ${garminConnected ? 'connected' : ''}`} style={{ margin: 0 }}>
          <div className="card-header-row">
            <div className="brand-badge-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#000000" style={{ display: 'block', backgroundColor: '#fff', borderRadius: '4px', padding: '2px' }}>
                  <path d="M11.96 0L0 7l4.58 13.97h14.86L24 7l-12.04-7zm-4.7 9.87h9.4l-1.92 6.13H9.19l-1.93-6.13z"/>
                </svg>
                <span className="brand-logo" style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>Garmin</span>
              </div>
              <span className={`status-badge ${garminConnected ? 'connected' : 'disconnected'}`}>
                {garminConnected ? 'Conectado' : 'Disponível'}
              </span>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <p>
              Sincronize automaticamente seus dados de sono, estresse, frequência cardíaca e treinos diretamente da nuvem da Garmin. 
              Nenhum aplicativo adicional necessário no seu celular.
            </p>

            {garminConnected ? (
               <div className="connection-details">
                 <div className="detail-row">
                   <span className="label">Status:</span>
                   <span className="value">Recebendo Webhooks</span>
                 </div>
               </div>
            ) : (
              <div className="features-list">
                <div className="feature-item">
                  <Moon size={14} color="#00a3e0" />
                  <span>Sincronização 100% na Nuvem (Cloud-to-Cloud)</span>
                </div>
                <div className="feature-item">
                  <Activity size={14} color="#00a3e0" />
                  <span>Integração de Webhooks em Tempo Real</span>
                </div>
              </div>
            )}

            <div className="card-actions" style={{ marginTop: 'auto' }}>
              {garminConnected ? (
                <button 
                  className="btn-disconnect" 
                  onClick={() => alert("Desconexão ainda não implementada")}
                >
                  <Trash2 size={18} />
                  Desconectar
                </button>
              ) : (
                <button className="btn-connect-strava" onClick={handleConnectGarmin} style={{ backgroundColor: '#00a3e0', color: '#fff', border: 'none' }}>
                  Conectar Conta Garmin <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRealSyncModal && (
        <div className="modal-overlay" onClick={() => setShowRealSyncModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configuração do Health Connect</h2>
              <button className="close-btn" onClick={() => setShowRealSyncModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
                <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>✕</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="step-box">
                <h4>Passo 1: Vincule o Samsung Health ao Health Connect</h4>
                <p>
                  No seu celular, abra o <strong>Samsung Health</strong>, vá em Configurações ➔ Apps ➔ <strong>Health Connect</strong> e ative a permissão para sincronizar dados de Sono e Estresse.
                </p>
              </div>

              <div className="step-box">
                <h4>Passo 2: Instale o App "Health Connect Webhook"</h4>
                <p>
                  Como os dados ficam salvos localmente no celular, instale o app <strong>Health Connect Webhook</strong>. Você pode baixá-lo gratuitamente na página de <a href="https://github.com/mcnaveen/health-connect-webhook/releases" target="_blank" rel="noopener noreferrer" style={{ color: '#34a853', textDecoration: 'underline', fontWeight: 600 }}>Releases do GitHub</a> ou pela Google Play Store.
                </p>
              </div>

              <div className="step-box">
                <h4>Passo 3: URL do Webhook</h4>
                <p>Insira a seguinte URL no campo de endpoint do aplicativo:</p>
                <div className="copy-input-group">
                  <input 
                    type="text" 
                    readOnly 
                    value="https://iyerxceeoydypyoahbbf.supabase.co/functions/v1/health-connect-sync" 
                  />
                  <button 
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText("https://iyerxceeoydypyoahbbf.supabase.co/functions/v1/health-connect-sync");
                      alert("URL copiada!");
                    }}
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="step-box">
                <h4>Passo 4: Token de Autorização</h4>
                <p>Configure a autorização. Use a opção permanente para que o aplicativo continue sincronizando em segundo plano sem expirar:</p>
                
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', color: '#34a853', fontWeight: 600 }}>
                  Opção Recomendada: Sincronização Permanente (Nunca expira)
                </p>
                <div className="copy-input-group" style={{ marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={`Bearer ${healthSyncToken}`} 
                    style={{ border: '1px solid rgba(52, 168, 83, 0.4)' }}
                  />
                  <button 
                    type="button"
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(`Bearer ${healthSyncToken}`);
                      alert("Chave de sincronização permanente copiada!");
                    }}
                    style={{ background: '#34a853' }}
                  >
                    Copiar
                  </button>
                </div>
                <button 
                  type="button"
                  className="btn-rotate-token"
                  onClick={handleRotateSyncToken}
                  disabled={rotatingToken}
                  style={{
                    fontSize: '11px',
                    color: '#f59e0b',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    marginBottom: '16px',
                    textAlign: 'left',
                    display: 'block'
                  }}
                >
                  {rotatingToken ? 'Gerando novo token...' : '🔄 Gerar Novo Token (Invalida o anterior)'}
                </button>

                <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '12px', marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', margin: '0 0 6px 0', color: 'var(--text-muted)' }}>
                    Opções Temporárias (Expiram em 1 hora, úteis apenas para testes rápidos):
                  </p>
                  
                  <p style={{ fontSize: '11px', margin: '4px 0 2px 0', color: 'var(--text-muted)' }}>Opção A: Cabeçalho completo de sessão</p>
                  <div className="copy-input-group" style={{ marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={`Bearer ${sessionToken}`} 
                      style={{ fontSize: '12px', opacity: 0.7 }}
                    />
                    <button 
                      type="button"
                      className="btn-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(`Bearer ${sessionToken}`);
                        alert("Cabeçalho copiado!");
                      }}
                      style={{ opacity: 0.7 }}
                    >
                      Copiar
                    </button>
                  </div>

                  <p style={{ fontSize: '11px', margin: '4px 0 2px 0', color: 'var(--text-muted)' }}>Opção B: Apenas o Token de sessão puro</p>
                  <div className="copy-input-group">
                    <input 
                      type="text" 
                      readOnly 
                      value={sessionToken} 
                      style={{ fontSize: '12px', opacity: 0.7 }}
                    />
                    <button 
                      type="button"
                      className="btn-copy"
                      onClick={() => {
                        navigator.clipboard.writeText(sessionToken);
                        alert("Token puro copiado!");
                      }}
                      style={{ opacity: 0.7 }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '11px', marginTop: '12px', color: '#f59e0b' }}>
                  Nota: Estes tokens identificam sua conta do Apogeu de forma segura. Não os compartilhe com terceiros.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
