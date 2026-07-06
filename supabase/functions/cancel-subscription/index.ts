// Cancela la suscripción de Stripe del usuario autenticado — se llama desde deleteAccount()
// en Profile.tsx antes de borrar sus datos, para no seguir cobrándole a una cuenta eliminada.
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import Stripe from "npm:stripe@17.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

Deno.serve(async req => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) return new Response("Unauthorized", { status: 401 });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.stripe_subscription_id) {
    // best-effort: si Stripe ya la había cancelado o el id quedó viejo, no rompemos el borrado de cuenta.
    await stripe.subscriptions.cancel(profile.stripe_subscription_id).catch(() => null);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
