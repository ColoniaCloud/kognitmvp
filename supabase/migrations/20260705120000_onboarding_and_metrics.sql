-- Onboarding: guarda el resultado del flujo de bienvenida (antes se perdía en useState local).
ALTER TABLE public.profiles
  ADD COLUMN onboarding_emotions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN onboarding_goals TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
