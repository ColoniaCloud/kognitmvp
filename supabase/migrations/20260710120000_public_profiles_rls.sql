-- Hasta ahora "profiles" solo era legible por el propio dueño (auth.uid() = id),
-- lo que en la práctica impedía que Community.tsx resolviera el display_name de
-- otros autores (la query a profiles para otros user_id volvía vacía por RLS,
-- así que siempre caía al nombre por defecto, community.defaultAuthor).
-- Ninguna columna de profiles es sensible (nombre, streak, xp, foco, hora de
-- recordatorio; plan/mercadopago ya están protegidas aparte por su propio
-- trigger protect_plan_columns), así que se abre lectura a cualquier autenticado.
CREATE POLICY "Authed read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
