import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service role client - ONLY use in API routes (server-side)
// This bypasses RLS for secure server operations
// Uses lazy initialization to avoid build-time errors

let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

// For backwards compatibility - will throw if called at build time
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  }
});
