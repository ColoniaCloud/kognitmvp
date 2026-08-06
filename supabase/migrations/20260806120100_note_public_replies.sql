-- Respuesta pública a una nota (visible en el feed). Distinta de la respuesta
-- privada (mensaje directo vía send_direct_message): esta se lee sin
-- restricción de conexión (misma regla que note_reactions: visible si la nota
-- es visible), pero solo se puede CREAR si sos el propio autor de la nota, o
-- si vos y el autor están conectados mutuamente y no hay bloqueo entre ambos.

CREATE TABLE public.note_public_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.note_public_replies TO authenticated;
GRANT ALL ON public.note_public_replies TO service_role;
ALTER TABLE public.note_public_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read public replies on visible notes" ON public.note_public_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_public_replies.note_id
        AND (n.visibility = 'public' OR n.user_id = auth.uid())
    )
  );

CREATE POLICY "Insert public reply if own note or mutually connected" ON public.note_public_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id
        AND (
          n.user_id = auth.uid()
          OR (
            n.visibility = 'public'
            AND public.is_mutually_connected(auth.uid(), n.user_id)
            AND NOT public.is_blocked_pair(auth.uid(), n.user_id)
          )
        )
    )
  );

CREATE POLICY "Users delete own public reply" ON public.note_public_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX note_public_replies_note_idx ON public.note_public_replies (note_id, created_at);
