/**
 * Login form component with validation and error handling
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { LoginCommand, AuthResponse } from "@/types";

// Validation schema matching backend
const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Nieprawidłowy format adresu email")
    .max(255, "Email nie może przekraczać 255 znaków"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type LoginFormData = z.infer<typeof LoginSchema>;

interface LoginFormProps {
  onSuccess?: (response: AuthResponse) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Map server errors to user-friendly messages
        switch (error.error) {
          case "InvalidCredentials":
            setServerError("Nieprawidłowy e-mail lub hasło.");
            break;
          case "TooManyAttempts":
            setServerError("Zbyt wiele prób logowania. Spróbuj ponownie później.");
            break;
          case "AuthError":
            setServerError("Błąd serwera uwierzytelniania. Spróbuj ponownie.");
            break;
          case "ValidationError":
            setServerError("Dane logowania są nieprawidłowe.");
            break;
          default:
            setServerError("Nie udało się zalogować. Spróbuj ponownie.");
        }
        return;
      }

      const authResponse: AuthResponse = await response.json();
      
      // Store JWT in localStorage
      localStorage.setItem("jwt", authResponse.jwt);
      localStorage.setItem("user", JSON.stringify(authResponse.user));

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess(authResponse);
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Login error:", error);
      setServerError("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Logowanie</h1>
        <p className="text-muted-foreground">
          Wprowadź swoje dane, aby zalogować się do systemu
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <ErrorBanner message={serverError} />}

        <div className="space-y-2">
          <Label htmlFor="email">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="twoj@email.pl"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            disabled={loading}
            {...register("email")}
          />
          {errors.email && (
            <p
              id="email-error"
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Hasło
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={loading}
            {...register("password")}
          />
          {errors.password && (
            <p
              id="password-error"
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Logowanie...
            </span>
          ) : (
            "Zaloguj"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nie masz jeszcze konta? </span>
        <a
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Zarejestruj się
        </a>
      </div>
    </div>
  );
}

