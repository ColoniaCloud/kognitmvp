-- "Renotear": referencia a una nota ajena en el feed, nunca copia el
-- contenido ni oculta al autor original (estilo retweet, no "compartir como
-- nota nueva"). Sin protección contra reposteo del propio contenido a nivel
-- de constraint (Postgres CHECK no puede mirar otra tabla) — se resuelve
-- ocultando el botón en la UI para notas propias, igual que "Responder".

CREATE TABLE public.note_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_id)
);
GRANT SELECT, INSERT, DELETE ON public.note_reposts TO authenticated;
GRANT ALL ON public.note_reposts TO service_role;
ALTER TABLE public.note_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read reposts of visible notes" ON public.note_reposts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_reposts.note_id
        AND (n.visibility = 'public' OR n.user_id = auth.uid())
    )
  );

CREATE POLICY "Users repost visible notes" ON public.note_reposts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND (n.visibility = 'public' OR n.user_id = auth.uid())
    )
  );

CREATE POLICY "Users delete own repost" ON public.note_reposts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX note_reposts_note_idx ON public.note_reposts (note_id);
CREATE INDEX note_reposts_user_idx ON public.note_reposts (user_id, created_at DESC);
