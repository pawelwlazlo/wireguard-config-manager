/**
 * Astro Middleware
 * Initializes Supabase client for all requests
 */

import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "@/db/supabase.client";

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize Supabase client in locals for all requests
  context.locals.supabase = supabaseClient;

  // TODO: When auth is implemented, add user session handling here
  // const session = await supabaseClient.auth.getSession();
  // context.locals.user = session.data.user;

  return next();
});
