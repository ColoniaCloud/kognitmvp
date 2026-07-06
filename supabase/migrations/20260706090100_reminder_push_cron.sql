-- Dispara la Edge Function "send-reminder-push" cada minuto vía pg_cron + pg_net.
-- Requiere habilitar las extensiones pg_cron y pg_net (Dashboard > Database > Extensions).
--
-- La service role key se guarda en Vault (no como texto plano en esta migración) y se lee
-- en el momento de invocar la función. Antes de aplicar esta migración hay que correr una vez:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- reemplazando <SERVICE_ROLE_KEY> por el valor real (Dashboard > Project Settings > API).
--
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminder-push-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://urebsukvtbdhtkixyyaw.supabase.co/functions/v1/send-reminder-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
