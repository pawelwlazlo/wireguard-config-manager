import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

// Export type for use in service functions
export type SupabaseClient = SupabaseClientType<Database>;

// Lazy initialization for clients to avoid import.meta.env issues in middleware
let _supabaseClient: SupabaseClient | null = null;
let _supabaseAdminClient: SupabaseClient | null = null;

/**
 * Get or create the public Supabase client (anon key)
 * Uses lazy initialization to avoid issues with import.meta.env in middleware
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    _supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _supabaseClient;
}

/**
 * Get or create the admin Supabase client (service_role key)
 * Bypasses RLS - use with caution!
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!_supabaseAdminClient) {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    _supabaseAdminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdminClient;
}

// Note: Use getSupabaseClient() and getSupabaseAdminClient() functions instead
// of direct imports to ensure proper lazy initialization





