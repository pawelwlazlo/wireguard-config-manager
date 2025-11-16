/**
 * Astro Middleware
 * Initializes Supabase client and handles authentication for all requests
 */

import { defineMiddleware } from "astro:middleware";
import { getSupabaseClient, getSupabaseAdminClient } from "@/db/supabase.client";
import { getProfile } from "@/lib/services/userService";

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip middleware during static prerendering (Astro.request may not be available)
  if (!context.request || !context.request.headers) {
    return next();
  }

  // Initialize Supabase client in locals for all requests (lazy initialization)
  const supabase = getSupabaseClient();
  context.locals.supabase = supabase;

  // Extract JWT token from cookie or Authorization header
  let token: string | undefined;
  
  // First, try to get token from cookie (SSR)
  const jwtCookie = context.cookies.get("jwt");
  if (jwtCookie) {
    token = jwtCookie.value;
  }
  
  // Fallback to Authorization header (API requests)
  if (!token) {
    const authHeader = context.request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
    }
  }
  
  if (token) {
    try {
      // Verify JWT token with Supabase Auth
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        // Fetch full user profile with roles from our database
        // Use admin client to bypass RLS (avoid infinite recursion in user_roles policy)
        const adminClient = getSupabaseAdminClient();
        const userProfile = await getProfile(adminClient, data.user.id);

        if (userProfile) {
          context.locals.user = userProfile;

          // Check if user needs to change password (for page requests only, not API)
          const url = new URL(context.request.url);
          const isPageRequest = !url.pathname.startsWith("/api/");
          const isChangePasswordPage = url.pathname === "/change-password";
          const isLoginPage = url.pathname === "/login";
          const isRegisterPage = url.pathname === "/register";

          // Redirect to change-password page if required
          // Skip redirect if:
          // - Already on change-password page (avoid redirect loop)
          // - On login/register page
          // - API endpoint (let API handle auth)
          if (
            userProfile.requires_password_change &&
            isPageRequest &&
            !isChangePasswordPage &&
            !isLoginPage &&
            !isRegisterPage
          ) {
            return context.redirect("/change-password");
          }

          // Don't allow access to change-password page if flag is not set
          // (unless there's a specific reason to allow it - commented out for now)
          // This allows users to voluntarily change their password
          // if (isChangePasswordPage && !userProfile.requires_password_change) {
          //   return context.redirect("/");
          // }
        }
      }
    } catch (error) {
      // Silently fail - endpoints will handle unauthorized access
      console.error("Auth middleware error:", error);
    }
  }

  return next();
});
