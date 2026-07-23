import { supabase } from "@/integrations/supabase/client";

/**
 * `profiles.avatar_url` guarda dos cosas distintas según de dónde venga la foto:
 *
 * - una ruta dentro del bucket `avatars` (`{user_id}/{uuid}.{ext}`) cuando el usuario
 *   la sube desde Perfil, o
 * - la URL absoluta del proveedor cuando la cuenta se creó con Google — el trigger
 *   `handle_new_user` copia `raw_user_meta_data->>'avatar_url'` / `'picture'` tal cual
 *   (migración `20260710140000_google_oauth_profile_fields.sql`).
 *
 * Pasar una URL absoluta por `getPublicUrl()` arma
 * `.../storage/v1/object/public/avatars/https://lh3.googleusercontent.com/...`,
 * que responde 404. Por eso hay que resolver siempre por acá y nunca llamar a
 * `getPublicUrl()` directo sobre `avatar_url`.
 */
export const resolveAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return supabase.storage.from("avatars").getPublicUrl(avatarUrl).data.publicUrl;
};
