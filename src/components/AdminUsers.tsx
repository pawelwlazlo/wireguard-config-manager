/**
 * Main admin users management component
 */

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Navigation } from "@/components/Navigation";
import { UserTableFilterBar } from "./admin/UserTableFilterBar";
import { UserTable } from "./admin/UserTable";
import { UserPagination } from "./admin/UserPagination";
import { UserLimitEditorModal } from "./admin/UserLimitEditorModal";
import { ResetPasswordModal } from "./admin/ResetPasswordModal";
import { useAdminUsers } from "./hooks/useAdminUsers";
import { api } from "@/lib/api";
import type { UserVM, UserFilter, UserDto } from "@/types";

export function AdminUsers() {
  const {
    users,
    page,
    size,
    total,
    sort,
    filters,
    loading,
    error,
    setFilters,
    setPage,
    setSize,
    setSort,
    reload,
  } = useAdminUsers();

  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserVM | null>(null);
  const [limitEditorOpen, setLimitEditorOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    // Fetch current user data for navigation
    api.getUser().then(setCurrentUser).catch(console.error);
  }, []);

  const handleFiltersChange = (newFilters: UserFilter) => {
    setFilters(newFilters);
  };

  const handleEditLimitClick = (user: UserVM) => {
    setSelectedUser(user);
    setLimitEditorOpen(true);
  };

  const handleResetPasswordClick = (user: UserVM) => {
    setSelectedUser(user);
    setResetPwdOpen(true);
  };

  const handleDeactivateClick = (user: UserVM) => {
    setSelectedUser(user);
    setConfirmOpen(true);
  };

  const handleLimitUpdate = async (userId: string, newLimit: number) => {
    try {
      await api.updateAdminUser(userId, { peer_limit: newLimit });
      toast.success("User limit updated successfully");
      setLimitEditorOpen(false);
      await reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update limit";
      toast.error(message);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      const result = await api.resetUserPassword(userId);
      toast.success("Password reset successfully");
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
      throw error;
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!selectedUser) return;

    try {
      setDeactivating(true);
      await api.updateAdminUser(selectedUser.id, { status: "inactive" });
      toast.success("User deactivated successfully");
      setConfirmOpen(false);
      await reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to deactivate user";
      toast.error(message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
  };

  return (
    <>
      <Toaster />
      <Navigation user={currentUser} />
      <div className="container mx-auto space-y-6 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <UserTableFilterBar value={filters} onChange={handleFiltersChange} />

        <UserTable
          users={users}
          loading={loading}
          sort={sort}
          onSortChange={handleSortChange}
          onEditLimit={handleEditLimitClick}
          onResetPassword={handleResetPasswordClick}
          onDeactivate={handleDeactivateClick}
        />

        {!loading && total > 0 && (
          <UserPagination
            page={page}
            size={size}
            total={total}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        )}

        {selectedUser && (
          <>
            <UserLimitEditorModal
              user={selectedUser}
              open={limitEditorOpen}
              onClose={() => setLimitEditorOpen(false)}
              onSubmit={handleLimitUpdate}
            />

            <ResetPasswordModal
              userId={selectedUser.id}
              userEmail={selectedUser.email}
              open={resetPwdOpen}
              onClose={() => setResetPwdOpen(false)}
              onReset={handlePasswordReset}
            />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to deactivate {selectedUser.email}? This
                    will prevent the user from logging in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeactivateConfirm}
                    disabled={deactivating}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deactivating ? "Deactivating..." : "Deactivate"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </>
  );
}

