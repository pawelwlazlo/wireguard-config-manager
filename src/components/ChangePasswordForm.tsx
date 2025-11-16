/**
 * Change password form component with validation and error handling
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import type { ChangePasswordCommand } from "@/types";
import type { ChangePasswordSuccess } from "@/types/view/change-password";

// Password policy validation schema
const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Aktualne hasło jest wymagane")
      .min(8, "Aktualne hasło musi mieć minimum 8 znaków"),
    newPassword: z
      .string()
      .min(1, "Nowe hasło jest wymagane")
      .min(12, "Nowe hasło musi mieć minimum 12 znaków")
      .regex(
        passwordPolicyRegex,
        "Hasło musi zawierać: małą literę, wielką literę, cyfrę i znak specjalny"
      ),
    confirmNewPassword: z
      .string()
      .min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmNewPassword"],
  });

type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>;

interface ChangePasswordFormProps {
  onSuccess?: (response: ChangePasswordSuccess) => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(ChangePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const currentPassword = watch("currentPassword");
  const newPassword = watch("newPassword");
  const confirmNewPassword = watch("confirmNewPassword");

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      // Get JWT from localStorage
      const jwt = localStorage.getItem("jwt");
      if (!jwt) {
        window.location.href = "/login";
        return;
      }

      const command: ChangePasswordCommand = {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      };

      const response = await fetch("/api/v1/users/me/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const error = await response.json();

        // Map server errors to user-friendly messages
        switch (error.error) {
          case "INCORRECT_CURRENT_PASSWORD":
            setServerError("Aktualne hasło jest nieprawidłowe.");
            break;
          case "WEAK_PASSWORD":
            setServerError(
              "Nowe hasło nie spełnia wymagań bezpieczeństwa. Sprawdź listę wymagań poniżej."
            );
            break;
          case "Unauthorized":
            // Session expired, redirect to login
            localStorage.removeItem("jwt");
            localStorage.removeItem("user");
            window.location.href = "/login";
            return;
          default:
            setServerError("Nie udało się zmienić hasła. Spróbuj ponownie.");
        }
        return;
      }

      const changePasswordResponse: ChangePasswordSuccess = await response.json();

      // Update JWT in localStorage
      localStorage.setItem("jwt", changePasswordResponse.jwt);

      // Show success message
      setSuccessMessage("Hasło zostało pomyślnie zmienione. Za chwilę zostaniesz przekierowany...");

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(changePasswordResponse);
        } else {
          window.location.href = "/";
        }
      }, 2000);
    } catch (error) {
      console.error("Change password error:", error);
      setServerError("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Zmiana hasła</h1>
        <p className="text-muted-foreground">
          Wprowadź aktualne hasło oraz nowe hasło zgodne z polityką bezpieczeństwa
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <ErrorBanner message={serverError} />}

        {successMessage && (
          <div
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        <PasswordInput
          id="currentPassword"
          label="Aktualne hasło"
          value={currentPassword}
          onChange={(value) => setValue("currentPassword", value, { shouldValidate: true })}
          error={errors.currentPassword?.message}
          disabled={loading}
          autoComplete="current-password"
        />

        <PasswordInput
          id="newPassword"
          label="Nowe hasło"
          value={newPassword}
          onChange={(value) => setValue("newPassword", value, { shouldValidate: true })}
          error={errors.newPassword?.message}
          disabled={loading}
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirmNewPassword"
          label="Potwierdź nowe hasło"
          value={confirmNewPassword}
          onChange={(value) => setValue("confirmNewPassword", value, { shouldValidate: true })}
          error={errors.confirmNewPassword?.message}
          disabled={loading}
          autoComplete="new-password"
        />

        <PasswordChecklist password={newPassword} />

        <Button type="submit" className="w-full" disabled={loading || !isValid}>
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
              Zmiana hasła...
            </span>
          ) : (
            "Zmień hasło"
          )}
        </Button>
      </form>
    </div>
  );
}

