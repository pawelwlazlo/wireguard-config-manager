/**
 * Astro Middleware
 * Initializes Supabase client and handles authentication for all requests
 */

import { defineMiddleware } from "astro:middleware";
import { getSupabaseClient, getSupabaseAdminClient } from "@/db/supabase.client";
import { getProfile } from "@/lib/services/userService";
import { syncAcceptedDomains } from "@/lib/services/domainService";
import { getEnv } from "@/lib/env";

// Flag to track if domains have been synchronized (per app instance)
let domainsSynced = false;

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip middleware during static prerendering (Astro.request may not be available)
  if (!context.request || !context.request.headers) {
    return next();
  }

  // Initialize Supabase client in locals for all requests (lazy initialization)
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    // If Supabase initialization fails (e.g., missing env vars during build), skip auth
    console.warn("Supabase client initialization failed, skipping auth middleware:", error);
    return next();
  }
  context.locals.supabase = supabase;

  // Synchronize accepted domains from environment to database (once per app instance)
  if (!domainsSynced) {
    try {
      const adminClient = getSupabaseAdminClient();
      await syncAcceptedDomains(adminClient);
      domainsSynced = true;
    } catch (error) {
      console.error("Failed to sync accepted domains:", error);
      // Continue anyway - this is not critical for app operation
    }
  }

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
      // TEST MODE: Accept mock token only when TEST_MOCK_AUTH is enabled OR in development mode
      // This allows E2E tests to bypass Supabase authentication
      // NEVER enable this in production - it's only for testing
      const testMockAuth = getEnv("TEST_MOCK_AUTH");
      const isDevMode = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
      const isTestMode = testMockAuth === "true" || isDevMode;
      const isMockToken = token.startsWith("test-mock-jwt-");

      if (isTestMode && isMockToken) {
        // Extract user type from mock token (format: test-mock-jwt-{userType})
        // Examples: test-mock-jwt-admin, test-mock-jwt-user
        const tokenParts = token.split("-");
        const userType = tokenParts[tokenParts.length - 1] || "user";

        // Create mock user profile based on token type
        const mockUser = {
          id: `${userType}-123`,
          email: `${userType}@example.com`,
          roles: userType === "admin" ? ["admin"] : ["user"],
          status: "active" as const,
          peer_limit: userType === "admin" ? 10 : 5,
          created_at: "2024-01-01T00:00:00Z",
          requires_password_change: false,
        };

        context.locals.user = mockUser;
        return next();
      }

      // PRODUCTION MODE: Normal Supabase authentication
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
