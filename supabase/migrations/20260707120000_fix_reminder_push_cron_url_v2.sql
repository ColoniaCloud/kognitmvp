-- La migración 20260706140000 apuntaba al proyecto anterior (goqrqtfdsrmjqjimjtwx).
-- Se migró a un proyecto nuevo (wpjufgefhcyncseuikel) — se reprograma con la URL correcta.
-- Nota para el futuro: si el proyecto vuelve a cambiar de ref, hay que repetir este fix
-- con la URL nueva (Postgres no tiene forma de leer su propio project ref/URL en runtime).
select cron.unschedule('send-reminder-push-every-minute');

select cron.schedule(
  'send-reminder-push-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://wpjufgefhcyncseuikel.supabase.co/functions/v1/send-reminder-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
