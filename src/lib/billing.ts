import { supabase } from "@/integrations/supabase/client";

export type BillingCycle = "monthly" | "annual";
export type Plan = "free" | "pro";

// Debe reflejar el auto_recurring.transaction_amount configurado en el plan de
// Mercado Pago (MERCADOPAGO_PLAN_ID_MONTHLY/ANNUAL) y el copy de
// landing.pricing.pro.price en los locales. El Brick de tarjeta solo usa este
// valor para filtrar medios de pago elegibles — el monto real de cobro lo
// define el plan del lado de Mercado Pago, no lo que mandamos acá.
export const PRO_PRICE_USD: Record<BillingCycle, number> = {
  monthly: 8.9,
  annual: 89,
};

export interface SubscribeResult {
  ok: boolean;
  status: string | null;
  error: string | null;
}

export async function subscribeWithCardToken(billing: BillingCycle, cardTokenId: string): Promise<SubscribeResult> {
  const { data, error } = await supabase.functions.invoke("create-checkout-preference", {
    body: { billing, card_token_id: cardTokenId },
  });
  if (error) {
    let detail: string | null = null;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        detail = body?.message ?? body?.error ?? null;
      } catch {
        // la respuesta no era JSON — nos quedamos con el mensaje genérico del SDK
      }
    }
    console.error("[billing:subscribe]", detail ?? error.message);
    return { ok: false, status: null, error: detail ?? error.message };
  }
  if (!data?.status) {
    console.error("[billing:subscribe] la función no devolvió un status", data);
    return { ok: false, status: null, error: "no_status" };
  }
  return { ok: true, status: data.status as string, error: null };
}

export async function cancelSubscription(): Promise<boolean> {
  const { error } = await supabase.functions.invoke("cancel-subscription");
  return !error;
}
