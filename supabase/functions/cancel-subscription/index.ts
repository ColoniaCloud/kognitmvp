// Cancela la suscripción (preapproval) de Mercado Pago del usuario autenticado.
// Se llama desde "Gestionar suscripción" en Profile.tsx y desde deleteAccount() antes de
// borrar sus datos, para no seguir cobrándole a una cuenta cancelada/eliminada.
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import { MercadoPagoConfig, PreApproval } from "npm:mercadopago@3.2.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

const mpClient = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
const preApproval = new PreApproval(mpClient);

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
    .select("mercadopago_preapproval_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.mercadopago_preapproval_id) {
    // best-effort: si Mercado Pago ya la había cancelado o el id quedó viejo, no rompemos el flujo.
    await preApproval.update({ id: profile.mercadopago_preapproval_id, body: { status: "cancelled" } }).catch(() => null);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
