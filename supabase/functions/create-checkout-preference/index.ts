// Crea una suscripción (preapproval) de Mercado Pago para pasar a Kognit Pro.
// El cliente tokeniza la tarjeta con el Brick de Mercado Pago (el número de
// tarjeta nunca pasa por acá) y nos manda solo el card_token_id resultante.
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@3.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
const MERCADOPAGO_PLAN_ID_MONTHLY = Deno.env.get("MERCADOPAGO_PLAN_ID_MONTHLY")!;
const MERCADOPAGO_PLAN_ID_ANNUAL = Deno.env.get("MERCADOPAGO_PLAN_ID_ANNUAL")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://kognit.in";

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
  const cardTokenId = typeof body.card_token_id === "string" ? body.card_token_id : null;
  const planId = billing === "annual" ? MERCADOPAGO_PLAN_ID_ANNUAL : MERCADOPAGO_PLAN_ID_MONTHLY;

  if (!planId) {
    console.error("[create-checkout-preference] falta el plan_id de Mercado Pago", { billing, hasMonthly: !!MERCADOPAGO_PLAN_ID_MONTHLY, hasAnnual: !!MERCADOPAGO_PLAN_ID_ANNUAL });
    return new Response(JSON.stringify({ error: "missing_plan_id", message: "No hay un plan_id configurado para este ciclo de facturación." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!cardTokenId) {
    return new Response(JSON.stringify({ error: "missing_card_token", message: "Falta el token de la tarjeta." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const subscription = await preApproval.create({
      body: {
        preapproval_plan_id: planId,
        card_token_id: cardTokenId,
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

    // Con card_token_id, Mercado Pago autoriza la suscripción en el momento
    // (no hay más init_point/redirect) — el estado final llega igual por el
    // webhook, esto es solo para que el cliente muestre feedback inmediato.
    return new Response(JSON.stringify({ status: subscription.status ?? "pending" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // El SDK de Mercado Pago tira objetos de error con propiedades no enumerables
    // (message/cause/status vía getters de clase) — JSON.stringify(err) a secas da
    // "{}" y err.message puede faltar, así que se extraen las own properties a mano.
    const details: Record<string, unknown> = {};
    if (err && typeof err === "object") {
      for (const key of Object.getOwnPropertyNames(err)) {
        try {
          details[key] = (err as Record<string, unknown>)[key];
        } catch {
          // getter que tira — se ignora esa propiedad puntual
        }
      }
    }
    console.error("[create-checkout-preference] error creando la preapproval", JSON.stringify(details), err);
    const message = (err instanceof Error && err.message) || JSON.stringify(details) || String(err);
    return new Response(JSON.stringify({ error: "mercadopago_error", message, details }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
});
