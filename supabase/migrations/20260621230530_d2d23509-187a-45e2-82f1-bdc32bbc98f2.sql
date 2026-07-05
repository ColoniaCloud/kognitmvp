ALTER TABLE public.reset_sessions
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS pre_intensity smallint,
  ADD COLUMN IF NOT EXISTS post_intensity smallint,
  ADD COLUMN IF NOT EXISTS states text[],
  ADD COLUMN IF NOT EXISTS note text;

CREATE INDEX IF NOT EXISTS reset_sessions_user_created_idx
  ON public.reset_sessions (user_id, created_at DESC);