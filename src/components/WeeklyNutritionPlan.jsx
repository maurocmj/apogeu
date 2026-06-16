import React from 'react';
import { Coffee, Utensils, Apple, Info } from 'lucide-react';
import './Spreadsheets.css';

const nutritionPlan = [
  { day: 'Segunda-feira', target: '2.400 kcal', breakfast: 'Ovos mexidos com espinafre e aveia', lunch: 'Peito de frango grelhado com quinoa e brócolis', snack: 'Iogurte natural com whey e amêndoas', dinner: 'Salmão com batata doce e salada verde' },
  { day: 'Terça-feira', target: '2.400 kcal', breakfast: 'Crepioca de queijo branco', lunch: 'Patinho moído com arroz integral e cenoura', snack: 'Maçã com pasta de amendoim', dinner: 'Sopa de abóbora com frango desfiado' },
  { day: 'Quarta-feira', target: '2.600 kcal (Treino Pesado)', breakfast: 'Panqueca de banana com aveia e mel', lunch: 'Macarrão integral com atum e molho de tomate', snack: 'Shake de Whey com banana', dinner: 'Omelete de 3 ovos com salada' },
  { day: 'Quinta-feira', target: '2.400 kcal', breakfast: 'Vitamina de abacate com chia', lunch: 'Filé mignon suíno com purê de batata', snack: 'Castanhas e kiwi', dinner: 'Wrap integral com frango e ricota' },
  { day: 'Sexta-feira', target: '2.400 kcal', breakfast: 'Pão integral com ovos cozidos', lunch: 'Tilápia assada com arroz com brócolis', snack: 'Iogurte grego', dinner: 'Temaki sem arroz (Salmão e cream cheese leve)' },
  { day: 'Sábado', target: '2.800 kcal (Livre)', breakfast: 'Pão na chapa e suco de laranja', lunch: 'Churrasco magro (maminha/alcatra) e vinagrete', snack: 'Frutas da estação', dinner: 'Pizza artesanal (2 fatias)' },
  { day: 'Domingo', target: '2.200 kcal (Recuperação)', breakfast: 'Mingau de aveia protéico', lunch: 'Estrogonofe fit (creme de ricota)', snack: 'Bolo de banana fit', dinner: 'Salada completa com grão de bico e atum' },
];

const WeeklyNutritionPlan = () => {
  return (
    <div className="glass spreadsheet-container">
      <div className="spreadsheet-header">
        <h3 className="neon-text" style={{ margin: 0 }}>Plano Nutricional Semanal</h3>
        <span className="badge badge-green">Foco: Hipertrofia & Redução de Inflamação</span>
      </div>

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Dia / Meta</th>
              <th><Coffee size={16} /> Café da Manhã</th>
              <th><Utensils size={16} /> Almoço</th>
              <th><Apple size={16} /> Lanche</th>
              <th><Utensils size={16} /> Jantar</th>
            </tr>
          </thead>
          <tbody>
            {nutritionPlan.map((item, index) => (
              <tr key={index}>
                <td className="highlight-col">
                  <strong>{item.day}</strong>
                  <span className="meta-text">{item.target}</span>
                </td>
                <td>{item.breakfast}</td>
                <td>{item.lunch}</td>
                <td>{item.snack}</td>
                <td>{item.dinner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="spreadsheet-footer">
        <Info size={16} color="var(--text-muted)" />
        <p>Este plano foi adaptado pela <strong>Nutri Agent</strong> considerando seus exames recentes e volume de corrida.</p>
      </div>
    </div>
  );
};

export default WeeklyNutritionPlan;
