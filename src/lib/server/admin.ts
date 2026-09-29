/**
 * Server-only Supabase admin client.
 *
 * Uses SUPABASE_SECRET_KEY for privileged server-side writes (ingestion,
 * admin document management). Never import this file from a client
 * component — "server-only" guards against accidental client bundling.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) {
      throw new Error("Server database is not configured (missing SUPABASE_SECRET_KEY).");
    }
    adminClient = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
