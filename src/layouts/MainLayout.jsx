import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard,
  Dumbbell, 
  Moon, 
  Utensils, 
  User, 
  Stethoscope, 
  LogOut,
  Settings,
  Target,
  HeartPulse,
  Link2,
  UserCircle
} from 'lucide-react';
import logo from '../assets/logo.png';
import './MainLayout.css';

const MainLayout = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === 'maurocmj@gmail.com') {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Início', developed: true },
    { path: '/esportivo', icon: <Dumbbell size={20} />, label: 'Esportivo', developed: false },
    { path: '/monitoramento', icon: <Moon size={20} />, label: 'Monitoramento', developed: false },
    { path: '/ingestao', icon: <Utensils size={20} />, label: 'Ingestão', developed: false },
    { path: '/body', icon: <User size={20} />, label: 'Body', developed: false },
    { path: '/perfil', icon: <Target size={20} />, label: 'Perfil e Metas', developed: true },
    { path: '/integracoes', icon: <Link2 size={20} />, label: 'Integrações', developed: true },
    { path: '/exames', icon: <HeartPulse size={20} />, label: 'Saúde', developed: true },
    { path: '/servicos', icon: <Stethoscope size={20} />, label: 'Serviços', developed: false }
  ];

  if (isAdmin) {
    menuItems.push({ path: '/admin', icon: <Settings />, label: 'Super Admin' });
  }

  return (
    <div className="layout-container">
      {/* Top Navbar */}
      <header className="top-navbar glass">
        <div className="navbar-brand">
          <img 
            src={logo} 
            alt="Apogeu Logo" 
            className="navbar-logo"
          />
          <div className="navbar-brand-divider"></div>
          <span className="navbar-brand-name">APOGEU</span>
        </div>

        <nav className="navbar-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.developed === false ? 'undeveloped' : ''}`}
              title={item.label}
            >
              <div className="nav-icon">{item.icon}</div>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <div className="nav-item" title="Usuário Logado">
            <UserCircle size={20} color="var(--primary)" />
          </div>
          <button className="nav-item logout" onClick={handleLogout} title="Sair" style={{ padding: '8px' }}>
            <LogOut color="#ef4444" size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
