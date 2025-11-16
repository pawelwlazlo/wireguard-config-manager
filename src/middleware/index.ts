/**
 * Astro Middleware
 * Initializes Supabase client and handles authentication for all requests
 */

import { defineMiddleware } from "astro:middleware";
import { getSupabaseClient } from "@/db/supabase.client";
import { getProfile } from "@/lib/services/userService";

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize Supabase client in locals for all requests (lazy initialization)
  const supabase = getSupabaseClient();
  context.locals.supabase = supabase;

  // Extract JWT token from Authorization header
  const authHeader = context.request.headers.get("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      // Verify JWT token with Supabase Auth
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        // Fetch full user profile with roles from our database
        const userProfile = await getProfile(supabase, data.user.id);

        if (userProfile) {
          context.locals.user = userProfile;
        }
      }
    } catch (error) {
      // Silently fail - endpoints will handle unauthorized access
      console.error("Auth middleware error:", error);
    }
  }

  return next();
});
