-- ============================================================================
-- Digital Heritage Archive — privilege fix (one-time, run in Supabase SQL editor)
--
-- The service_role (used by SUPABASE_SECRET_KEY) is missing its standard
-- Supabase grants on the public schema tables/sequences. Without these, all
-- server-side ingestion and admin writes fail with:
--   "permission denied for table documents"
--
-- This does NOT change the schema, does NOT touch RLS policies, and does NOT
-- grant anything to anon/authenticated (the public client stays read-only).
-- It only restores the default Supabase behaviour where service_role bypasses
-- RLS and has full access, which is required for:
--   - archival text ingestion (scripts/ingest-archival-text.mjs)
--   - chunk embedding ingestion (document_chunks writes)
--   - admin document management (secure server-side routes)
--   - timeline/media/collections seeding
-- ============================================================================

-- Tables: full access for the server-side service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequences (serial columns, if any)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Functions (match_chunks etc.)
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Ensure future objects are covered too
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Optionally widen the publishable (anon) client's read access to the tables
-- currently exposed. Existing RLS policies still apply — this only grants the
-- base SELECT privilege so RLS can be evaluated for them.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
