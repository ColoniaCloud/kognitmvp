import { supabase } from "@/integrations/supabase/client";

export type BillingCycle = "monthly" | "annual";
export type Plan = "free" | "pro";

export async function startCheckout(billing: BillingCycle): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: { billing } });
  if (error || !data?.url) return null;
  return data.url as string;
}

export async function openBillingPortal(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("create-portal-session");
  if (error || !data?.url) return null;
  return data.url as string;
}

export async function cancelSubscriptionForDeletion(): Promise<void> {
  await supabase.functions.invoke("cancel-subscription").catch(() => null);
}
