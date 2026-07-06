-- Suscripciones Web Push (una por dispositivo/navegador) para el recordatorio diario.
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- La Edge Function que dispara los pushes corre con la service role key (bypassea RLS)
-- para poder leer perfiles/suscripciones de todos los usuarios en cada corrida del cron.

-- Necesario para saber a qué hora local corresponde el "reminder_time" de cada usuario.
ALTER TABLE public.profiles
  ADD COLUMN reminder_timezone TEXT NOT NULL DEFAULT 'UTC';
