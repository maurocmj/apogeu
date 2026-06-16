import React from 'react';
import { Target, Activity, Zap, Info } from 'lucide-react';
import './Spreadsheets.css';

const trainingPlan = [
  { day: 'Segunda-feira', type: 'Força (Membros Inferiores)', details: 'Agachamento Livre (4x10) • Leg Press (4x12) • Extensora (3x15) • Panturrilha (4x20)', hrZone: 'Z3 (130-150 bpm)', status: 'Pendente' },
  { day: 'Terça-feira', type: 'Corrida (Base)', details: 'Aquecimento 10min • Corrida leve 40min (Pace: 6:00/km) • Alongamento', hrZone: 'Z2 (115-130 bpm)', status: 'Pendente' },
  { day: 'Quarta-feira', type: 'Descanso Ativo', details: 'Caminhada leve 30min ou Yoga/Mobilidade', hrZone: 'Z1 (< 115 bpm)', status: 'Pendente' },
  { day: 'Quinta-feira', type: 'Força (Superiores & Core)', details: 'Supino (4x10) • Remada (4x10) • Prancha (3x 1min) • Elevação Pélvica', hrZone: 'Z3 (130-150 bpm)', status: 'Pendente' },
  { day: 'Sexta-feira', type: 'Corrida (Tiro/Intervalado)', details: 'Aquecimento 15min • 8x (400m forte + 200m trote) • Desaquecimento', hrZone: 'Z4 (150-170 bpm)', status: 'Pendente' },
  { day: 'Sábado', type: 'Descanso Total', details: 'Recuperação Muscular • Foco em hidratação e sono', hrZone: '-', status: 'Pendente' },
  { day: 'Domingo', type: 'Long Run', details: 'Corrida contínua 18km (Pace alvo: 5:45/km) • Focar na cadência', hrZone: 'Z2 a Z3', status: 'Pendente' },
];

const getStatusBadge = (status) => {
  if (status === 'Concluído') return <span className="badge badge-green">Concluído</span>;
  if (status === 'Pendente') return <span className="badge badge-orange">Pendente</span>;
  return <span>{status}</span>;
};

const TrainingSpreadsheet = () => {
  return (
    <div className="glass spreadsheet-container">
      <div className="spreadsheet-header">
        <h3 className="neon-text" style={{ margin: 0 }}>Ciclo de Treino Semanal</h3>
        <span className="badge badge-red">Foco: Preparação Maratona 10km</span>
      </div>

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Dia</th>
              <th><Target size={16} /> Modalidade</th>
              <th><Activity size={16} /> Prescrição (Séries / Distância)</th>
              <th><Zap size={16} /> Zona Alvo (BPM)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trainingPlan.map((item, index) => (
              <tr key={index}>
                <td className="highlight-col"><strong>{item.day}</strong></td>
                <td style={{ color: 'var(--text-main)' }}>{item.type}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{item.details}</td>
                <td>{item.hrZone}</td>
                <td>{getStatusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="spreadsheet-footer">
        <Info size={16} color="var(--text-muted)" />
        <p>Planilha gerada pelo <strong>Personal Agent</strong>. Cumpra pelo menos 80% do volume para garantir o resultado esperado na prova.</p>
      </div>
    </div>
  );
};

export default TrainingSpreadsheet;
