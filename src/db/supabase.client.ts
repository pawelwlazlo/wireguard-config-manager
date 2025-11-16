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
      // During build/prerender, env vars might not be available - use dummy client
      console.warn('Missing SUPABASE_URL or SUPABASE_ANON_KEY - using dummy client for build');
      _supabaseClient = createClient<Database>(
        'https://dummy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15IiwidW9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.dummy'
      );
    } else {
      _supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    }
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
      // During build/prerender, env vars might not be available - use dummy client
      console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - using dummy admin client for build');
      _supabaseAdminClient = createClient<Database>(
        'https://dummy.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15IiwdW9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.dummy',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    } else {
      _supabaseAdminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  }
  return _supabaseAdminClient;
}

// Note: Use getSupabaseClient() and getSupabaseAdminClient() functions instead
// of direct imports to ensure proper lazy initialization





