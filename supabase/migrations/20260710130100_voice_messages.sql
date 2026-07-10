INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Participants read own voice-messages folder" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'voice-messages' AND (
      auth.uid()::text = split_part((storage.foldername(name))[1], '_', 1)
      OR auth.uid()::text = split_part((storage.foldername(name))[1], '_', 2)
    )
  );
CREATE POLICY "Participants upload to own voice-messages folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'voice-messages' AND (
      auth.uid()::text = split_part((storage.foldername(name))[1], '_', 1)
      OR auth.uid()::text = split_part((storage.foldername(name))[1], '_', 2)
    )
  );
CREATE POLICY "Participants delete own voice-messages folder" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'voice-messages' AND (
      auth.uid()::text = split_part((storage.foldername(name))[1], '_', 1)
      OR auth.uid()::text = split_part((storage.foldername(name))[1], '_', 2)
    )
  );
