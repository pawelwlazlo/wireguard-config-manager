/**
 * Environment variables helper
 * Provides unified access to environment variables in both dev and production
 */

/**
 * Get environment variable value
 * In development: tries import.meta.env first, then process.env
 * In production (Docker): uses process.env
 * 
 * @param key - Environment variable name
 * @param defaultValue - Optional default value if not found
 * @returns Value or undefined/default
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  // Try import.meta.env first (available in most contexts)
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    const value = import.meta.env[key as keyof ImportMetaEnv];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  
  // Fallback to process.env (Node.js runtime, Docker)
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  
  return defaultValue;
}

/**
 * Get required environment variable
 * Throws error if not found
 * 
 * @param key - Environment variable name
 * @returns Value
 * @throws Error if variable is not set
 */
export function getRequiredEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

