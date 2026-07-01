import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthGuard = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        // Verifica se o usuário já completou o onboarding na tabela profiles
        const { data } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', session.user.id)
          .single();
        
        // Se a flag não for verdadeira, redireciona para o onboarding
        if (!data || data.has_completed_onboarding !== true) {
          setNeedsOnboarding(true);
        }
      }
      setLoading(false);
    };

    checkAuthAndOnboarding();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', color: '#00e5ff' }}>Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se precisa de onboarding e não está na página de onboarding, redireciona para lá
  // if (needsOnboarding && location.pathname !== '/onboarding') {
  //   return <Navigate to="/onboarding" replace />;
  // }

  return <Outlet />;
};

export default AuthGuard;
