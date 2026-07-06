// Edge Function invocada cada minuto por pg_cron (ver migración 20260706090100).
// Busca perfiles con recordatorio activo cuya hora local matchee el minuto actual,
// y les manda un Web Push con las suscripciones guardadas en push_subscriptions.
import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails("mailto:soporte@kognitapp.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// "HH:MM" en la timezone del perfil, para comparar contra profiles.reminder_time.
function currentHHMMInTimezone(timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  } catch {
    return null; // timezone inválida guardada en el perfil — se lo salta en vez de romper la corrida.
  }
}

Deno.serve(async () => {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, reminder_time, reminder_timezone")
    .eq("reminder_enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const due = (profiles ?? []).filter(p => currentHHMMInTimezone(p.reminder_timezone) === p.reminder_time);
  if (due.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  let sent = 0;
  const staleSubscriptionIds: string[] = [];

  for (const profile of due) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", profile.id);

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: "Kognit",
            body: "Antes de jugar, escuchate un segundo. ¿Cómo llegás hoy?",
            url: "/app",
          }),
        );
        sent += 1;
      } catch (err) {
        // 404/410 = la suscripción ya no existe del lado del navegador (desinstaló, limpió datos, etc.)
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          staleSubscriptionIds.push(sub.id);
        }
      }
    }
  }

  if (staleSubscriptionIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubscriptionIds);
  }

  return new Response(JSON.stringify({ sent, staleRemoved: staleSubscriptionIds.length }), { status: 200 });
});
