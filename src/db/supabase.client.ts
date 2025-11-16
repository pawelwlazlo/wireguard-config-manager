import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (anon key) - for authenticated users
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client (service_role key) - bypasses RLS, use with caution!
export const supabaseAdminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export type for use in service functions
export type SupabaseClient = SupabaseClientType<Database>;





