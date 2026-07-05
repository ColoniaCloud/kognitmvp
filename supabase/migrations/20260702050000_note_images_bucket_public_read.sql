-- La migración anterior (20260702024050) creó las policies de storage para
-- note-images asumiendo que el bucket ya existía, y dejó la lectura restringida
-- a usuarios autenticados. El bucket nunca se creó, y CLAUDE.md documenta que
-- las imágenes de notas son de lectura pública.
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authed read note-images" ON storage.objects;

CREATE POLICY "Public read note-images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'note-images');
