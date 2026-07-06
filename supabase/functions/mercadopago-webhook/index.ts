// Recibe las notificaciones de Mercado Pago y sincroniza profiles.plan — es la ÚNICA vía que puede
// cambiar plan/plan_status/mercadopago_* (ver trigger protect_plan_columns en la migración).
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@3.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
const MERCADOPAGO_WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")!;

const mpClient = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preApproval = new PreApproval(mpClient);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Valida la firma según el esquema documentado por Mercado Pago:
// header "x-signature: ts=...,v1=..." es el HMAC-SHA256 (hex) del manifest
// "id:{data.id};request-id:{x-request-id};ts:{ts};" usando el webhook secret.
async function isValidSignature(signatureHeader: string, requestId: string, dataId: string): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map(p => p.trim().split("=").map(s => s.trim()) as [string, string]),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MERCADOPAGO_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(signatureBytes)).map(b => b.toString(16).padStart(2, "0")).join("");
  return computed === v1;
}

// Refleja el estado real de Mercado Pago: "authorized" mantiene Pro, cualquier otro estado
// (pending/paused/cancelled) corta el acceso — MP ya maneja sus propios reintentos de cobro
// (hasta 3) antes de cancelar la suscripción, así que no hace falta un grace period propio acá.
function keepsProAccess(status: string): boolean {
  return status === "authorized";
}

Deno.serve(async req => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  const signatureHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id") ?? "";
  if (!signatureHeader || !dataId) return new Response("Missing signature or data.id", { status: 400 });

  const valid = await isValidSignature(signatureHeader, requestId, dataId);
  if (!valid) return new Response("Invalid signature", { status: 401 });

  if (type === "subscription_preapproval") {
    const subscription = await preApproval.get({ id: dataId });
    const status = subscription.status ?? "unknown";
    await supabase
      .from("profiles")
      .update({
        plan: keepsProAccess(status) ? "pro" : "free",
        plan_status: status,
        mercadopago_preapproval_id: subscription.id,
        plan_current_period_end: subscription.auto_recurring?.end_date ?? null,
      })
      .eq("mercadopago_preapproval_id", subscription.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
