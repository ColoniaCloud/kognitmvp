import { supabase } from "@/integrations/supabase/client";

export type BillingCycle = "monthly" | "annual";
export type Plan = "free" | "pro";

export async function startCheckout(billing: BillingCycle): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("create-checkout-preference", { body: { billing } });
  if (error || !data?.url) return null;
  return data.url as string;
}

export async function cancelSubscription(): Promise<boolean> {
  const { error } = await supabase.functions.invoke("cancel-subscription");
  return !error;
}
