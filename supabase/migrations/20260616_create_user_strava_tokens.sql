-- Migration: Create user_strava_tokens table
CREATE TABLE IF NOT EXISTS public.user_strava_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  strava_athlete_id bigint unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_strava_tokens ENABLE ROW LEVEL SECURITY;

-- Policy (Only own user can read/write their tokens)
CREATE POLICY "Users can manage their own Strava connection" 
ON public.user_strava_tokens 
FOR ALL 
USING (auth.uid() = user_id);
