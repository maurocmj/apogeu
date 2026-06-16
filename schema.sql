-- Script de Criação do Schema APOGEU (Event Sourcing & Modular)

-- 1. Habilitar extensão para IDs UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela: profiles (Dados base estendendo auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  birth_date date,
  gender text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela: body_metrics (Gêmeo Digital - Histórico Morfológico)
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  weight numeric,
  height numeric,
  body_fat_percentage numeric,
  chest_circumference numeric,
  waist_circumference numeric,
  hip_circumference numeric,
  muscle_mass numeric
);

-- 4. Tabela: user_goals (Histórico de Objetivos)
CREATE TABLE IF NOT EXISTS public.user_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  goal_type text not null, -- Ex: 'Emagrecimento', 'Hipertrofia', 'Longevidade'
  description text,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  is_active boolean default true
);

-- 5. Tabela: medical_history (Anamnese Base)
CREATE TABLE IF NOT EXISTS public.medical_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  baseline_data jsonb default '{}'::jsonb not null, -- JSONB: alergias, lesões, histórico familiar
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela: medical_exams (Uploads Estruturados Híbridos)
CREATE TABLE IF NOT EXISTS public.medical_exams (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  exam_type text not null, -- Ex: 'blood_test', 'xray', 'mri'
  collection_date date not null,
  document_url text,
  medical_report text, -- Laudo do radiologista
  biomarkers jsonb default '{}'::jsonb, -- Valores quantitativos (HDL, Ferro, etc)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tabela: health_events (Event Sourcing - O Coração do Sistema)
CREATE TABLE IF NOT EXISTS public.health_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null, -- Ex: 'MEAL_LOGGED', 'EXAM_UPLOADED', 'WORKOUT_COMPLETED'
  event_date timestamp with time zone default timezone('utc'::text, now()) not null,
  payload jsonb default '{}'::jsonb not null
);

-- 8. Tabela: daily_habits (Projeção de Leitura Rápida)
CREATE TABLE IF NOT EXISTS public.daily_habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  metrics jsonb default '{}'::jsonb not null, -- JSONB: agua, sono, humor
  UNIQUE(user_id, date)
);

-- 9. Tabela: agent_insights (Conclusões das Inteligências Artificiais)
CREATE TABLE IF NOT EXISTS public.agent_insights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  agent_role text not null, -- Ex: 'Medical', 'Nutri', 'Personal'
  context text,
  content text not null,
  status text default 'unread', -- 'unread', 'accepted', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- Configuração de Segurança RLS (Row Level Security)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_insights ENABLE ROW LEVEL SECURITY;

-- Exemplo simplificado de política RLS (Permitir que usuários leiam/escrevam apenas seus dados)
-- Nota: Para profiles, auth.uid() = id. Para as demais, auth.uid() = user_id.

CREATE POLICY "Usuários acessam apenas seu perfil" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Usuários acessam apenas suas medidas" ON public.body_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam apenas seus objetivos" ON public.user_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam apenas sua anamnese" ON public.medical_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam apenas seus exames" ON public.medical_exams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam apenas seus eventos" ON public.health_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam apenas seus hábitos" ON public.daily_habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam apenas insights de seus agentes" ON public.agent_insights FOR ALL USING (auth.uid() = user_id);
