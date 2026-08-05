-- Bug: send_direct_message() nunca podía reutilizar una fila de message_requests ya
-- existente salvo que estuviera en status 'pending' vista por el destinatario, o
-- 'declined'. "SELECT ... FOR UPDATE" bajo RLS con SECURITY INVOKER exige, además de
-- pasar el USING de la policy de SELECT, pasar también el USING de alguna policy de
-- UPDATE (Postgres trata el lock implícito como parte de un update) — y las dos
-- policies de UPDATE de esta tabla solo cubren status='pending' con auth.uid() distinto
-- del iniciador, o status='declined'. Una fila 'accepted' (o 'pending' vista por su
-- propio iniciador) no matcheaba ninguna, así que el SELECT ... FOR UPDATE la devolvía
-- como "no encontrada" aunque un SELECT plano sí la viera. La función entonces
-- reintentaba el INSERT en message_requests, chocaba con la unique constraint
-- (user_min, user_max) y el envío fallaba con 23505 en vez de mandar el mensaje —
-- en la práctica, cualquier segundo mensaje a alguien con quien ya había una solicitud
-- (aceptada o iniciada por uno mismo) rompía.
--
-- Pasar la función a SECURITY DEFINER (mismo patrón que is_blocked_pair, ver migración
-- 20260710130000) evita depender de esas policies para su propia lectura/lock interno.
-- No habilita ninguna escritura nueva desde el cliente: los chequeos de seguridad que
-- antes daba RLS (destinatario inválido, bloqueo, quién puede insertar/actualizar y con
-- qué valores) ya estaban — o quedan acá — hechos a mano, replicando exactamente lo que
-- las policies ya permitían.
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_recipient_id uuid,
  p_content text DEFAULT NULL,
  p_note_id uuid DEFAULT NULL,
  p_audio_path text DEFAULT NULL,
  p_audio_duration_seconds smallint DEFAULT NULL
) RETURNS public.messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
