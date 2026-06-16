import React, { useState } from 'react';
import { Mail, ArrowRight, Lock, ArrowLeft } from 'lucide-react';
import ECGBackground from '../components/ECGBackground';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabaseClient';
import './Login.css';

const Login = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erro no login via Google:', error.message);
      alert('Erro ao conectar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (email) {
      setStep(2);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password) {
      alert("Para a versão segura, utilize o Login via Google logo abaixo.");
    }
  };

  return (
    <div className="login-wrapper">
      <ECGBackground />
      
      {/* Language Selector */}
      <div className="language-selector-pill">
        <button className="lang-pill-btn active">PT</button>
        <button className="lang-pill-btn">EN</button>
      </div>

      <div className="login-content">
        
        {/* Left Branding */}
        <div className="login-brand">
          <img src={logo} alt="Quantico Logo" className="login-logo" />
          <div className="brand-divider"></div>
          <span className="brand-name">APOGEU</span>
        </div>

        {/* Right Form */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div className="login-form-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
            {step === 1 ? (
              <form className="login-input-group" onSubmit={handleNext}>
                <Mail className="input-icon" size={18} />
                <input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <button type="submit" className="submit-btn" aria-label="Avançar">
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <form className="login-input-group" onSubmit={handleLogin}>
                <button type="button" className="back-btn" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} />
                </button>
                <Lock className="input-icon" size={18} style={{ marginLeft: '4px' }} />
                <input 
                  type="password" 
                  placeholder="Sua senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="submit" className="submit-btn" aria-label="Entrar">
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            {step === 1 && (
              <button 
                className="google-auth-btn" 
                aria-label="Google Login"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? 'Conectando...' : ''}
              </button>
            )}
          </div>
          
          <div className="login-subtext-container" style={{ position: 'absolute', top: '100%', left: 0, justifyContent: 'flex-start', marginTop: '8px', width: '100%' }}>
            {step === 2 && (
              <button type="button" className="forgot-password-link">Esqueci minha senha</button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
