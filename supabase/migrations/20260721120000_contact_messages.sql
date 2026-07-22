-- Mensajes del formulario de contacto de la landing (público, sin sesión requerida).
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  email text NOT NULL CHECK (char_length(email) > 0 AND char_length(email) <= 320),
  message text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;

-- Solo inserción: nadie puede leer mensajes ajenos vía anon/authenticated,
-- el equipo los revisa desde el dashboard de Supabase (service role).
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
