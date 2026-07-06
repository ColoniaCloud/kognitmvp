-- handle_new_user rompía para usuarios anónimos (modo invitado): NEW.email es NULL para esos
-- usuarios, split_part(NULL, '@', 1) da NULL, y display_name es NOT NULL sin default aplicado
-- porque el INSERT pasa el valor explícitamente. Esto hacía fallar signInAnonymously() con
-- "Database error creating anonymous user" en cualquier proyecto (bug preexistente, no
-- introducido por la migración de proyecto).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Jugador'));
  RETURN NEW;
END;
$$;
