/**
 * Register form component with validation and error handling
 * Includes email domain validation and password strength checklist
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import type { RegisterCommand, AuthResponse } from "@/types";

// Password validation regex patterns
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERNS = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
};

// Custom password validator that checks all criteria
const passwordValidator = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`)
  .refine((val) => PASSWORD_PATTERNS.upper.test(val), {
    message: "Hasło musi zawierać co najmniej jedną wielką literę",
  })
  .refine((val) => PASSWORD_PATTERNS.lower.test(val), {
    message: "Hasło musi zawierać co najmniej jedną małą literę",
  })
  .refine((val) => PASSWORD_PATTERNS.number.test(val), {
    message: "Hasło musi zawierać co najmniej jedną cyfrę",
  })
  .refine((val) => PASSWORD_PATTERNS.special.test(val), {
    message: "Hasło musi zawierać co najmniej jeden znak specjalny",
  });

// Validation schema for registration form
const RegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email jest wymagany")
      .email("Nieprawidłowy format adresu email")
      .max(255, "Email nie może przekraczać 255 znaków"),
    password: passwordValidator,
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof RegisterSchema>;

interface RegisterFormProps {
  onSuccess?: (response: AuthResponse) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    mode: "onBlur",
  });

  // Watch password for checklist
  const password = watch("password", "");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerError(null);

    try {
      const payload: RegisterCommand = {
        email: data.email,
        password: data.password,
      };

      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();

        // Map server errors to user-friendly messages
        switch (error.error) {
          case "InvalidDomain":
            setServerError(
              "Domena adresu email nie jest dozwolona. Użyj adresu firmowego."
            );
            break;
          case "EmailExists":
            setServerError("Ten adres email jest już zarejestrowany.");
            break;
          case "WeakPassword":
            setServerError(
              "Hasło nie spełnia wymagań bezpieczeństwa. Sprawdź checklistę poniżej."
            );
            break;
          case "ValidationError":
            setServerError("Dane rejestracji są nieprawidłowe.");
            break;
          case "AuthError":
            setServerError("Błąd serwera uwierzytelniania. Spróbuj ponownie.");
            break;
          default:
            setServerError("Nie udało się zarejestrować. Spróbuj ponownie.");
        }
        return;
      }

      const authResponse: AuthResponse = await response.json();

      // Store JWT in localStorage
      localStorage.setItem("jwt", authResponse.jwt);
      localStorage.setItem("user", JSON.stringify(authResponse.user));

      // Call success callback or redirect to dashboard
      if (onSuccess) {
        onSuccess(authResponse);
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Registration error:", error);
      setServerError(
        "Brak połączenia z serwerem. Sprawdź połączenie internetowe."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Rejestracja</h1>
        <p className="text-muted-foreground">
          Utwórz nowe konto, aby korzystać z systemu
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <ErrorBanner message={serverError} />}

        <div className="space-y-2">
          <Label htmlFor="email">Email firmowy</Label>
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
          <p className="text-xs text-muted-foreground">
            Użyj adresu email z dozwolonej domeny firmowej
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Hasło</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={
              errors.password ? "password-error" : "password-checklist"
            }
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

        {/* Password strength checklist */}
        <div id="password-checklist">
          <PasswordChecklist password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Powtórz hasło</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            disabled={loading}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p
              id="confirm-password-error"
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
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
              Rejestrowanie...
            </span>
          ) : (
            "Zarejestruj się"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Masz już konto? </span>
        <a href="/login" className="font-medium text-primary hover:underline">
          Zaloguj się
        </a>
      </div>
    </div>
  );
}

