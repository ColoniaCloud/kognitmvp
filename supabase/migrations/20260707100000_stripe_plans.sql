-- Monetización: plan Free/Pro sincronizado con Stripe.
-- "plan" es la fuente de verdad que lee el frontend para el gating de features;
-- lo actualiza únicamente el webhook de Stripe (service role), nunca el cliente.
ALTER TABLE public.profiles
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  ADD COLUMN plan_status TEXT,
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN plan_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX profiles_stripe_customer_id_idx ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- La policy "Users can update own profile" (migración inicial) es a nivel de fila, no de columna:
-- sin esto, cualquier usuario autenticado podría hacer
--   supabase.from("profiles").update({ plan: "pro" }).eq("id", user.id)
-- y regalarse Kognit Pro gratis. Este trigger fuerza que plan/plan_status/stripe_* solo cambien
-- cuando la conexión es la service role key (la que usa el webhook de Stripe) — cualquier intento
-- del cliente de tocar estas columnas se revierte en silencio al valor anterior.
CREATE OR REPLACE FUNCTION public.protect_plan_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.plan := OLD.plan;
    NEW.plan_status := OLD.plan_status;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.plan_current_period_end := OLD.plan_current_period_end;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_plan_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_columns();
