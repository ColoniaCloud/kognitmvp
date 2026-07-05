
DROP POLICY IF EXISTS "Authed read reactions" ON public.note_reactions;

CREATE POLICY "Read reactions on visible notes"
ON public.note_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = note_reactions.note_id
      AND (n.visibility = 'public' OR n.user_id = auth.uid())
  )
);
