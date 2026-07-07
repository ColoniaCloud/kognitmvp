-- Bug encontrado en Sprint 6: enablePushReminders() hace un upsert con onConflict "endpoint".
-- Si el endpoint ya existe (el usuario reactiva el recordatorio en el mismo dispositivo), el upsert
-- ejecuta un UPDATE bajo RLS. Faltaba la policy de UPDATE, así que ese caso quedaba bloqueado en silencio.
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
