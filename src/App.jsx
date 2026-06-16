import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Sports from './pages/Sports';
import Monitoring from './pages/Monitoring';
import Ingestion from './pages/Ingestion';
import Body from './pages/Body';
import Exams from './pages/Exams';
import Services from './pages/Services';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import Integrations from './pages/Integrations';
import StravaCallback from './pages/StravaCallback';
import AuthGuard from './components/AuthGuard';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        {/* Protected Routes */}
        <Route element={<AuthGuard />}>
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="esportivo" element={<Sports />} />
            <Route path="monitoramento" element={<Monitoring />} />
            <Route path="ingestao" element={<Ingestion />} />
            <Route path="body" element={<Body />} />
            <Route path="perfil" element={<Profile />} />
            <Route path="integracoes" element={<Integrations />} />
            <Route path="integracoes/callback" element={<StravaCallback />} />
            <Route path="exames" element={<Exams />} />
            <Route path="servicos" element={<Services />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
