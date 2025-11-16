/**
 * Modal for resetting user password
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ResetPasswordResponse } from "@/types";

interface ResetPasswordModalProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onClose: () => void;
  onReset: (userId: string) => Promise<ResetPasswordResponse>;
}

export function ResetPasswordModal({
  userId,
  userEmail,
  open,
  onClose,
  onReset,
}: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [temporaryPassword, setTemporaryPassword] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setError(undefined);
    setLoading(true);

    try {
      const result = await onReset(userId);
      setTemporaryPassword(result.temporary_password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleClose = () => {
    setTemporaryPassword(undefined);
    setError(undefined);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Reset password for {userEmail}
          </DialogDescription>
        </DialogHeader>

        {!temporaryPassword ? (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                This will generate a temporary password that the user must change
                on their next login. The temporary password will be shown only once.
              </AlertDescription>
            </Alert>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertDescription className="text-green-800 dark:text-green-200">
                Password has been reset successfully. Share this temporary password
                with the user securely.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="temp-password">Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  id="temp-password"
                  type="text"
                  value={temporaryPassword}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user will be required to change this password on their next login.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!temporaryPassword ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

