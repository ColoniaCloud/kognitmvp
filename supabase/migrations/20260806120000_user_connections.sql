-- "Conectar": reemplaza profile_admirations (admiración unidireccional) por un
-- modelo de conexión mutua. La arista sigue siendo dirigida (follower_id →
-- following_id) pero la UI nunca expone "seguir": el cliente compara ambas
-- direcciones y muestra "Conectado" (unidireccional) o "Conectados" (mutuo).
-- MVP sin datos reales que preservar: se dropea profile_admirations acá mismo.

DROP TABLE IF EXISTS public.profile_admirations;

CREATE TABLE public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_connections_not_self CHECK (follower_id <> following_id),
  UNIQUE (follower_id, following_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_connections TO authenticated;
GRANT ALL ON public.user_connections TO service_role;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authed read connections" ON public.user_connections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own connection" ON public.user_connections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id AND NOT public.is_blocked_pair(follower_id, following_id));
CREATE POLICY "Users remove own connection" ON public.user_connections
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE INDEX user_connections_follower_idx ON public.user_connections (follower_id);
CREATE INDEX user_connections_following_idx ON public.user_connections (following_id);

-- Mismo patrón que is_blocked_pair (20260710130000): SECURITY DEFINER, usado
-- también dentro de la policy de INSERT de note_public_replies.
CREATE OR REPLACE FUNCTION public.is_mutually_connected(a uuid, b uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_connections WHERE follower_id = a AND following_id = b)
     AND EXISTS (SELECT 1 FROM public.user_connections WHERE follower_id = b AND following_id = a);
$$;
GRANT EXECUTE ON FUNCTION public.is_mutually_connected(uuid, uuid) TO authenticated;
