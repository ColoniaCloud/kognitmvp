CREATE TABLE public.profile_admirations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_admirations_not_self CHECK (giver_id <> recipient_id),
  UNIQUE (giver_id, recipient_id)
);
GRANT SELECT, INSERT, DELETE ON public.profile_admirations TO authenticated;
GRANT ALL ON public.profile_admirations TO service_role;
ALTER TABLE public.profile_admirations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed read admirations" ON public.profile_admirations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users give own admiration" ON public.profile_admirations FOR INSERT TO authenticated WITH CHECK (auth.uid() = giver_id);
CREATE POLICY "Users remove own admiration" ON public.profile_admirations FOR DELETE TO authenticated USING (auth.uid() = giver_id);
CREATE INDEX profile_admirations_recipient_idx ON public.profile_admirations (recipient_id);
