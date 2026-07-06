// Crea una suscripción (preapproval) de Mercado Pago para pasar a Kognit Pro.
// El cliente solo recibe una URL (init_point) y redirige — no tokenizamos tarjetas acá.
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@3.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
const MERCADOPAGO_PLAN_ID_MONTHLY = Deno.env.get("MERCADOPAGO_PLAN_ID_MONTHLY")!;
const MERCADOPAGO_PLAN_ID_ANNUAL = Deno.env.get("MERCADOPAGO_PLAN_ID_ANNUAL")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://kognitapp.lovable.app";

const mpClient = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preApproval = new PreApproval(mpClient);

Deno.serve(async req => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  // Cliente con el JWT del usuario que llama — sirve solo para identificarlo (auth.getUser()),
  // nunca para tocar profiles (eso lo hace el admin client con la service role).
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user || !user.email) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const billing = body.billing === "annual" ? "annual" : "monthly";
  const planId = billing === "annual" ? MERCADOPAGO_PLAN_ID_ANNUAL : MERCADOPAGO_PLAN_ID_MONTHLY;

  const subscription = await preApproval.create({
    body: {
      preapproval_plan_id: planId,
      payer_email: user.email,
      external_reference: user.id,
      back_url: `${APP_URL}/app?upgrade=success`,
    },
  });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  await supabaseAdmin
    .from("profiles")
    .update({ mercadopago_preapproval_id: subscription.id, mercadopago_customer_id: subscription.payer_id ? String(subscription.payer_id) : null })
    .eq("id", user.id);

  // Con credenciales de prueba (TEST-...) hay que redirigir a sandbox_init_point en vez de init_point.
  const url = MERCADOPAGO_ACCESS_TOKEN.startsWith("TEST-") ? subscription.sandbox_init_point : subscription.init_point;

  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
