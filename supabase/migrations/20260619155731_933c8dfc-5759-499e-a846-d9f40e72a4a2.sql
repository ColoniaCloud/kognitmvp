
-- NOTES
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  mood text,
  tag text,
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_visibility_check CHECK (visibility IN ('private','public'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anyone authed views public notes" ON public.notes FOR SELECT TO authenticated USING (visibility = 'public');
CREATE POLICY "Users insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER notes_touch_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX notes_public_created_idx ON public.notes (created_at DESC) WHERE visibility = 'public';
CREATE INDEX notes_user_created_idx ON public.notes (user_id, created_at DESC);

-- NOTE REACTIONS
CREATE TABLE public.note_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_reactions TO authenticated;
GRANT ALL ON public.note_reactions TO service_role;
ALTER TABLE public.note_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authed read reactions" ON public.note_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reactions" ON public.note_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reactions" ON public.note_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.note_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX note_reactions_note_idx ON public.note_reactions (note_id);

-- RITUAL ENTRIES
CREATE TABLE public.ritual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy smallint NOT NULL,
  body_tension smallint NOT NULL,
  emotional_state text NOT NULL,
  reflection text,
  gratitude text,
  intention text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritual_entries TO authenticated;
GRANT ALL ON public.ritual_entries TO service_role;
ALTER TABLE public.ritual_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rituals" ON public.ritual_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ritual_entries_user_created_idx ON public.ritual_entries (user_id, created_at DESC);

-- RESET SESSIONS
CREATE TABLE public.reset_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reset_sessions TO authenticated;
GRANT ALL ON public.reset_sessions TO service_role;
ALTER TABLE public.reset_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own resets" ON public.reset_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PROFILE: reminder settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_time text NOT NULL DEFAULT '19:00';
