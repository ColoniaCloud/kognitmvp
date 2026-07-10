-- Estado de "solicitud" por par de usuarios (no por mensaje)
CREATE TABLE public.message_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_min uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_max uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_requests_not_self CHECK (user_min <> user_max),
  CONSTRAINT message_requests_ordered CHECK (user_min < user_max),
  CONSTRAINT message_requests_initiator_is_participant CHECK (initiator_id = user_min OR initiator_id = user_max),
  UNIQUE (user_min, user_max)
);
GRANT SELECT, INSERT, UPDATE ON public.message_requests TO authenticated;
GRANT ALL ON public.message_requests TO service_role;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER message_requests_touch_updated_at
  BEFORE UPDATE ON public.message_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Participants view own request" ON public.message_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_min OR auth.uid() = user_max);
CREATE POLICY "Initiator creates pending request" ON public.message_requests
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_min OR auth.uid() = user_max) AND auth.uid() = initiator_id AND status = 'pending');
CREATE POLICY "Recipient responds to pending request" ON public.message_requests
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND (auth.uid() = user_min OR auth.uid() = user_max) AND auth.uid() <> initiator_id)
  WITH CHECK ((auth.uid() = user_min OR auth.uid() = user_max) AND status IN ('accepted','declined'));
-- Rechazo blando: cualquiera de los dos puede reactivar una solicitud rechazada volviendo a escribir
CREATE POLICY "Either participant restarts a declined request" ON public.message_requests
  FOR UPDATE TO authenticated
  USING (status = 'declined' AND (auth.uid() = user_min OR auth.uid() = user_max))
  WITH CHECK ((auth.uid() = user_min OR auth.uid() = user_max) AND status = 'pending' AND initiator_id = auth.uid());

CREATE INDEX message_requests_user_min_idx ON public.message_requests (user_min);
CREATE INDEX message_requests_user_max_idx ON public.message_requests (user_max);

-- Bloqueo de usuario
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own blocks" ON public.user_blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users create own blocks" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users remove own blocks" ON public.user_blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);
CREATE INDEX user_blocks_blocker_idx ON public.user_blocks (blocker_id);

-- Helper SECURITY DEFINER: chequea bloqueo en ambas direcciones sin depender de
-- que el llamador tenga permiso RLS para ver la fila del otro lado.
CREATE OR REPLACE FUNCTION public.is_blocked_pair(a uuid, b uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated;

-- Silenciar / eliminar conversación (por usuario, no afecta al otro lado)
CREATE TABLE public.conversation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_settings_not_self CHECK (owner_id <> peer_id),
  UNIQUE (owner_id, peer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversation_settings TO authenticated;
GRANT ALL ON public.conversation_settings TO service_role;
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER conversation_settings_touch_updated_at
  BEFORE UPDATE ON public.conversation_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "Users manage own conversation settings" ON public.conversation_settings
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE INDEX conversation_settings_owner_idx ON public.conversation_settings (owner_id, peer_id);

-- messages: permitir audio, endurecer el INSERT (bloqueo)
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.messages ADD COLUMN audio_path text;
ALTER TABLE public.messages ADD COLUMN audio_duration_seconds smallint;
ALTER TABLE public.messages ADD CONSTRAINT messages_has_payload
  CHECK (content IS NOT NULL OR audio_path IS NOT NULL);

DROP POLICY "Users send as themselves" ON public.messages;
CREATE POLICY "Users send subject to block" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND NOT public.is_blocked_pair(sender_id, recipient_id));

-- Envío atómico: crea/actualiza la solicitud y el mensaje en una sola transacción
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_recipient_id uuid,
  p_content text DEFAULT NULL,
  p_note_id uuid DEFAULT NULL,
  p_audio_path text DEFAULT NULL,
  p_audio_duration_seconds smallint DEFAULT NULL
) RETURNS public.messages
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_min uuid := LEAST(v_sender, p_recipient_id);
  v_max uuid := GREATEST(v_sender, p_recipient_id);
  v_req public.message_requests;
  v_msg public.messages;
BEGIN
  IF v_sender IS NULL OR v_sender = p_recipient_id THEN RAISE EXCEPTION 'invalid_recipient'; END IF;
  IF public.is_blocked_pair(v_sender, p_recipient_id) THEN RAISE EXCEPTION 'blocked'; END IF;

  SELECT * INTO v_req FROM public.message_requests WHERE user_min = v_min AND user_max = v_max FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.message_requests (user_min, user_max, initiator_id, status)
    VALUES (v_min, v_max, v_sender, 'pending');
  ELSIF v_req.status = 'declined' THEN
    UPDATE public.message_requests SET initiator_id = v_sender, status = 'pending' WHERE id = v_req.id;
  END IF;

  INSERT INTO public.messages (sender_id, recipient_id, note_id, content, audio_path, audio_duration_seconds)
  VALUES (v_sender, p_recipient_id, p_note_id, p_content, p_audio_path, p_audio_duration_seconds)
  RETURNING * INTO v_msg;
  RETURN v_msg;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text, uuid, text, smallint) TO authenticated;
