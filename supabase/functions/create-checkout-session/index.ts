// Crea una Stripe Checkout Session (hosted) para pasar a Kognit Pro.
// El cliente solo recibe una URL y redirige — no usamos Stripe.js/Elements.
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import Stripe from "npm:stripe@17.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_MONTHLY = Deno.env.get("STRIPE_PRICE_MONTHLY")!;
const STRIPE_PRICE_ANNUAL = Deno.env.get("STRIPE_PRICE_ANNUAL")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://kognitapp.lovable.app";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

Deno.serve(async req => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  // Cliente con el JWT del usuario que llama — sirve solo para identificarlo (auth.getUser()),
  // nunca para tocar profiles (eso lo hace el admin client con la service role).
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const billing = body.billing === "annual" ? "annual" : "monthly";
  const priceId = billing === "annual" ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/app?upgrade=success`,
    cancel_url: `${APP_URL}/app?upgrade=cancelled`,
    metadata: { supabase_user_id: user.id },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
