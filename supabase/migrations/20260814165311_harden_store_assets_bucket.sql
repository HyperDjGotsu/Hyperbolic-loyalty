-- Capture live store-assets bucket config as of 2026-08-14.
-- SVG excluded (inline scripts in SVG content served as image/svg+xml = stored XSS).
-- 5 MB limit aligns with application-side checks in upload-banner and upload-prize-item routes.
-- Idempotent UPDATE: no-op if bucket already at target state.
-- Note: bucket must exist before this migration runs (created via Supabase dashboard).
UPDATE storage.buckets
SET
  file_size_limit    = 5000000,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'store-assets';
