import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { Activity, Flame, Heart, Moon, Droplet, User as UserIcon, Medal, Apple, Dumbbell, Brain, Target } from 'lucide-react';
import RadarChartScore from '../components/RadarChartScore';
import GoalTimeline from '../components/GoalTimeline';
import AgentBubbleCard from '../components/AgentBubbleCard';
import { supabase } from '../lib/supabaseClient';

const Dashboard = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Obter nome da tabela de perfis
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        if (data && data.full_name) {
          setUserName(data.full_name);
        } else {
          // Fallback para o email ou metadata
          setUserName(session.user.user_metadata?.full_name || session.user.email.split('@')[0]);
        }
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="home-container">
      {/* Left Column: Profile & Stats */}
      <aside className="home-left-col">
        <div className="profile-card glass">
          <div className="profile-avatar">
            <UserIcon size={32} color="#00e5ff" />
          </div>
          <h2>{userName || 'Carregando...'}</h2>
          
          <div className="profile-stats">
            <div className="stat-box">
              <span className="stat-num">164</span>
              <span className="stat-label">Dias Corridos</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">507</span>
              <span className="stat-label">Atividades</span>
            </div>
          </div>
        </div>

        <div className="streak-card glass">
          <div className="card-header">
            <h3>Sua Sequência</h3>
            <Flame color="#f59e0b" size={20} />
          </div>
          <div className="streak-days">
            <div className="streak-day active">S</div>
            <div className="streak-day active">T</div>
            <div className="streak-day active">Q</div>
            <div className="streak-day">Q</div>
            <div className="streak-day">S</div>
            <div className="streak-day">S</div>
            <div className="streak-day">D</div>
          </div>
          <p className="streak-text">3 dias seguidos atingindo a meta de hidratação!</p>
        </div>
      </aside>

      {/* Main Column: Feed & Charts */}
      <main className="home-main-col">
        <div className="feed-card glass">
          <div className="feed-header">
            <h3>Visão Geral Multidimensional</h3>
            <span className="badge">Atualizado hoje</span>
          </div>
          <div className="radar-section">
            <div className="radar-chart-wrapper">
              <RadarChartScore />
            </div>
            <div className="radar-insights">
              <div className="insight-item positive">
                <strong>Exames:</strong> Todos os biomarcadores em nível ótimo.
              </div>
              <div className="insight-item warning">
                <strong>Sono:</strong> Média de 6h20 esta semana. Abaixo da meta (7h).
              </div>
              <div className="insight-item positive">
                <strong>Body/Mente:</strong> Níveis de stress reduzidos em 15%.
              </div>
            </div>
          </div>
        </div>

        <div className="feed-card glass">
          <div className="feed-header">
            <h3>Jornada APOGEU</h3>
          </div>
          <GoalTimeline />
        </div>

        {/* Conselho dos Especialistas - Independent Cards */}
        <h3 className="section-title">Conselho dos Especialistas (IA)</h3>
        <div className="agent-tips-container">
          <div className="agent-tip-card glass nutri">
            <div className="agent-tip-icon"><Apple size={20} /></div>
            <div className="agent-tip-content">
              <strong>Nutri Agent</strong>
              <p>Aumente a ingestão de carboidratos complexos hoje para compensar o treino longo planejado para amanhã.</p>
            </div>
          </div>
          <div className="agent-tip-card glass personal">
            <div className="agent-tip-icon"><Dumbbell size={20} /></div>
            <div className="agent-tip-content">
              <strong>Personal Agent</strong>
              <p>Sua variabilidade de frequência cardíaca (HRV) está excelente. É um bom dia para bater PRs.</p>
            </div>
          </div>
          <div className="agent-tip-card glass mind">
            <div className="agent-tip-icon"><Brain size={20} /></div>
            <div className="agent-tip-content">
              <strong>Mind Agent</strong>
              <p>Seus níveis de stress caíram, mas o sono profundo foi curto. Considere meditação guiada antes de dormir.</p>
            </div>
          </div>
          <div className="agent-tip-card glass goal">
            <div className="agent-tip-icon"><Target size={20} /></div>
            <div className="agent-tip-content">
              <strong>Goal Agent</strong>
              <p>Você está 5% à frente do planejamento para a sua meta da maratona. Mantenha a constância.</p>
            </div>
          </div>
        </div>
        
        {/* Quick metrics grid moved here */}
        <div className="metrics-compact-grid">
          <div className="metric-mini-card glass">
            <Heart color="#ef4444" size={16} />
            <div className="metric-info">
              <span className="metric-val">72 bpm</span>
              <span className="metric-name">Repouso</span>
            </div>
          </div>
          <div className="metric-mini-card glass">
            <Moon color="#8b5cf6" size={16} />
            <div className="metric-info">
              <span className="metric-val">85%</span>
              <span className="metric-name">Qual. Sono</span>
            </div>
          </div>
          <div className="metric-mini-card glass">
            <Flame color="#f59e0b" size={16} />
            <div className="metric-info">
              <span className="metric-val">2.4k</span>
              <span className="metric-name">Kcal</span>
            </div>
          </div>
          <div className="metric-mini-card glass">
            <Droplet color="#3b82f6" size={16} />
            <div className="metric-info">
              <span className="metric-val">1.5L</span>
              <span className="metric-name">Água</span>
            </div>
          </div>
        </div>
      </main>

      {/* Right Column: AI Chat & Challenges */}
      <aside className="home-right-col">
        <AgentBubbleCard 
          agentId="apogeu"
          agentName="APOGEU IA" 
          agentColor="var(--primary)" 
          message="Olá, Mauro! Hoje o seu foco está na recuperação muscular e hidratação. Seus indicadores de sono foram muito bons." 
        />
        
        <div className="challenges-card glass">
          <div className="card-header">
            <h3>Desafios</h3>
            <Medal color="#00e5ff" size={20} />
          </div>
          <div className="challenge-item">
            <div className="challenge-icon">🏃</div>
            <div className="challenge-info">
              <h4>Desafio 50k Mensal</h4>
              <div className="progress-bar-mini">
                <div className="progress-fill-mini" style={{width: '60%'}}></div>
              </div>
              <span>30/50 km</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Dashboard;
