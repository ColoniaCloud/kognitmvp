// Recibe los eventos de Stripe y sincroniza profiles.plan — es la ÚNICA vía que puede
// cambiar plan/plan_status/stripe_* (ver trigger protect_plan_columns en la migración).
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import Stripe from "npm:stripe@17.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setPlanByCustomer(customerId: string, fields: Record<string, unknown>) {
  await supabase.from("profiles").update(fields).eq("stripe_customer_id", customerId);
}

// Devuelve true si el usuario debe seguir viendo las features Pro con este status.
// "past_due" (pago falló pero Stripe todavía reintenta) no corta el acceso de golpe —
// eso lo maneja Stripe con sus reintentos/dunning; acá solo reflejamos el estado.
function keepsProAccess(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

Deno.serve(async req => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.customer && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await setPlanByCustomer(session.customer as string, {
          plan: "pro",
          plan_status: subscription.status,
          stripe_subscription_id: subscription.id,
          plan_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await setPlanByCustomer(subscription.customer as string, {
        plan: keepsProAccess(subscription.status) ? "pro" : "free",
        plan_status: subscription.status,
        plan_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await setPlanByCustomer(subscription.customer as string, {
        plan: "free",
        plan_status: "canceled",
        stripe_subscription_id: null,
      });
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
