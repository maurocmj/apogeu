import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';

const StravaCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Autenticando com o Strava...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleExchange = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        console.error('Strava OAuth error parameter:', errorParam);
        setError(`Erro do Strava: ${errorParam}`);
        return;
      }

      if (!code) {
        setError('Código de autorização não encontrado na URL.');
        return;
      }

      try {
        setStatus('Restaurando sessão...');
        
        // Espera a sessão ser restaurada (evita o race condition de carregar antes do login do Supabase inicializar)
        let session = null;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        session = currentSession;
        
        if (!session) {
          // Tenta carregar por até 3 segundos
          for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (checkSession) {
              session = checkSession;
              break;
            }
          }
        }

        if (!session) {
          throw new Error('Usuário não autenticado. Por favor, faça login no Holos antes de prosseguir.');
        }

        setStatus('Trocando tokens com segurança...');
        
        // Chamada para a Supabase Edge Function
        const { data, error: invokeError } = await supabase.functions.invoke('strava-integration/exchange', {
          body: { code }
        });

        if (invokeError || (data && data.error)) {
          throw new Error(invokeError?.message || data?.error || 'Erro na troca de token.');
        }

        setStatus('Sucesso! Redirecionando...');
        
        // Redireciona de volta para a página de integrações
        setTimeout(() => {
          navigate('/integracoes', { 
            state: { 
              type: 'success', 
              text: 'Conexão com o Strava realizada e primeiros treinos sincronizados!' 
            } 
          });
        }, 1500);

      } catch (err) {
        console.error('OAuth Exchange error:', err);
        setError(err.message || 'Falha ao autenticar com o Strava.');
      }
    };

    handleExchange();
  }, [searchParams, navigate]);

  return (
    <div className="module-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '65vh', 
      gap: '24px' 
    }}>
      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '400px', textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" />
          <h2 style={{ color: '#fff' }}>Falha na Autenticação</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{error}</p>
          <button 
            onClick={() => navigate('/integracoes')}
            style={{ 
              marginTop: '16px', 
              padding: '10px 20px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px',
              color: '#fff',
              fontWeight: '600'
            }}
          >
            Voltar para Integrações
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={48} color="var(--primary)" className="spin" />
          <h2 style={{ color: '#fff', fontSize: '20px' }}>{status}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Por favor, não feche esta janela.</p>
        </div>
      )}
    </div>
  );
};

export default StravaCallback;
