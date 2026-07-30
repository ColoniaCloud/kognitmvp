-- El nombre por defecto de un perfil nuevo era 'Jugador', heredado de cuando el
-- producto se comunicaba solo a jugadores de poker. Ahora apunta a público general,
-- así que pasa a 'Usuario' — que además es lo que ya decía la UI
-- (`common.defaultUserName` en los locales), o sea que hasta ahora eran distintos.
--
-- Afecta a los perfiles que se creen de acá en adelante: invitados (modo anónimo,
-- sin email del cual derivar un nombre) y signups de Google que no expongan nombre.
--
-- Los perfiles existentes NO se tocan a propósito: alguien que hoy se llama
-- 'Jugador' pudo haberlo elegido, y renombrarlo sería pisarle el perfil.

ALTER TABLE public.profiles
  ALTER COLUMN display_name SET DEFAULT 'Usuario';

-- Mismo cambio en el último eslabón del COALESCE del trigger. El resto de la función
-- queda igual que en 20260710140000_google_oauth_profile_fields.sql.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Usuario'
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$;
