-- Ancla de calma: la frase que el usuario fija en un buen momento para poder
-- volver a ella cuando está en tilt. Hasta ahora vivía en localStorage
-- ("kognit:calm-anchor-phrase"), o sea que se perdía al reinstalar la PWA y no
-- cruzaba de dispositivo — inaceptable para algo que la UI presenta como
-- sostenido en el tiempo ("la venís usando hace N días").
--
-- Tabla aparte y no una columna de "profiles" a propósito: desde
-- 20260710120000_public_profiles_rls.sql, profiles es legible por cualquier
-- usuario autenticado (USING (true)) para poder resolver nombres de autores en
-- Comunidad. RLS no filtra por columna, así que una columna ahí dejaría el
-- ancla — el texto más íntimo de la app — a la vista de todo el padrón.
--
-- user_id como PRIMARY KEY: el ancla es única y mutable, así lo garantiza el
-- schema en vez de la UI. created_at no se toca al editar la frase (es la misma
-- ancla, refinada); solo se reinicia si se borra la fila y se crea otra.

CREATE TABLE public.calm_anchors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calm_anchors TO authenticated;
GRANT ALL ON public.calm_anchors TO service_role;
ALTER TABLE public.calm_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own anchor" ON public.calm_anchors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create own anchor" ON public.calm_anchors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own anchor" ON public.calm_anchors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own anchor" ON public.calm_anchors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER calm_anchors_touch_updated_at
  BEFORE UPDATE ON public.calm_anchors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
