-- Feedback del programa de testers (pestaña lateral dentro de /app).
-- El usuario no escribe su nombre ni su email: los manda el cliente desde la sesión,
-- por eso quedan desnormalizados acá y el equipo puede leer la tabla sin joins.
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  email text NOT NULL CHECK (char_length(email) > 0 AND char_length(email) <= 320),
  category text NOT NULL CHECK (category IN ('bug', 'idea', 'confusing', 'other')),
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;

-- Solo inserción y solo en nombre propio: nadie lee el feedback ajeno con la anon key,
-- el equipo lo revisa desde el dashboard de Supabase (service role bypasea RLS).
-- Mismo criterio que contact_messages y prelaunch_signups.
CREATE POLICY "Users submit their own feedback" ON public.feedback_submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- La condición del plan Pro de testing es mandar feedback al menos una vez por semana:
-- este índice es el que sirve esa consulta por usuario.
CREATE INDEX feedback_submissions_user_created_idx
  ON public.feedback_submissions (user_id, created_at DESC);
