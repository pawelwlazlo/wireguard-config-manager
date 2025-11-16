/**
 * View-specific types for Change Password page
 */

// Success response from change password endpoint
export interface ChangePasswordSuccess {
  jwt: string; // New JWT token after password change
}

// Error types that can be returned from the API
export type ChangePasswordError =
  | { code: "INCORRECT_CURRENT_PASSWORD"; message: string }
  | { code: "WEAK_PASSWORD"; message: string }
  | { code: "UNKNOWN"; message: string };

// Form values for the change password form
export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

