/**
 * View types for Login page
 */

export interface LoginFormState {
  email: string;
  password: string;
  loading: boolean;
  serverError: string | null;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

