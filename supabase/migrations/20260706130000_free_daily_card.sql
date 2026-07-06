-- Cartas mentales: en el plan Free la carta del día es fija (se sortea una sola vez).
-- Se persiste acá para que sea la misma si el usuario cierra y reabre la app ese día.
-- No son columnas sensibles como "plan" (gatean una limitación de uso, no un beneficio pago),
-- así que no llevan el trigger protect_plan_columns.
ALTER TABLE public.profiles
  ADD COLUMN free_card_drawn_on TEXT,
  ADD COLUMN free_card_category INTEGER,
  ADD COLUMN free_card_index INTEGER;
