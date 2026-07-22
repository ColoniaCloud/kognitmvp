-- Lista de espera del prelanzamiento (sección "Anotate al prelanzamiento" en la landing).
CREATE TABLE public.prelaunch_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  email text NOT NULL UNIQUE CHECK (char_length(email) > 0 AND char_length(email) <= 320),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prelaunch_signups ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.prelaunch_signups TO anon, authenticated;
GRANT ALL ON public.prelaunch_signups TO service_role;

-- Solo inserción: nadie puede leer ni ver quién más se anotó vía anon/authenticated,
-- el equipo revisa la lista desde el dashboard de Supabase (service role).
CREATE POLICY "Anyone can join the prelaunch waitlist" ON public.prelaunch_signups
  FOR INSERT TO anon, authenticated WITH CHECK (true);
