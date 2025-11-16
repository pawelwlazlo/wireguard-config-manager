/**
 * Navigation component for authenticated users
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, LogOut, Key, Users, Settings, LayoutDashboard } from "lucide-react";
import type { UserDto } from "@/types";

interface NavigationProps {
  user?: UserDto | null;
}

export function Navigation({ user }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) {
    return null;
  }

  const isAdmin = user.roles.includes("admin");
  const initials = user.email
    .split("@")[0]
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href={isAdmin ? "/admin/peers" : "/"} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                  <path d="M8.5 8.5v.01" />
                  <path d="M16 15.5v.01" />
                  <path d="M12 12v.01" />
                  <path d="M11 17v.01" />
                  <path d="M7 14v.01" />
                </svg>
              </div>
              <span className="text-lg font-semibold">WireGuard Manager</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-4 md:flex">
            {isAdmin ? (
              <>
                <a
                  href="/admin/peers"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Peers
                </a>
                <a
                  href="/admin/users"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Users
                </a>
                <a
                  href="/admin/config"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Config
                </a>
                <a
                  href="/admin/audit"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Audit Log
                </a>
              </>
            ) : (
              <a
                href="/"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </a>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isAdmin ? "Administrator" : "User"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <a href="/" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        User Dashboard
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <a href="/change-password" className="cursor-pointer">
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="border-t py-4 md:hidden">
            <div className="flex flex-col space-y-3">
              {isAdmin ? (
                <>
                  <a
                    href="/admin/peers"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Peers
                  </a>
                  <a
                    href="/admin/users"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Users
                  </a>
                  <a
                    href="/admin/config"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Config
                  </a>
                  <a
                    href="/admin/audit"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Audit Log
                  </a>
                  <hr className="border-border" />
                  <a
                    href="/"
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    User Dashboard
                  </a>
                </>
              ) : (
                <a
                  href="/"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dashboard
                </a>
              )}
              <hr className="border-border" />
              <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{user.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin ? "Administrator" : "User"}
                  </span>
                </div>
              </div>
              <a
                href="/change-password"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Change Password
              </a>
              <button
                onClick={handleLogout}
                className="text-left text-sm font-medium text-destructive transition-colors hover:text-destructive/90"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

