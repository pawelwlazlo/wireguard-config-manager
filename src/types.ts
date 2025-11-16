// Data Transfer Object (DTO) and Command Model definitions for REST API
// These types are derived from database entities declared in src/db/database.types.ts
// and should be kept in sync with backend schema.

import type { Tables, Enums } from "@/db/database.types";

/* -------------------------------------------------------------------------- */
/*                                    Base                                    */
/* -------------------------------------------------------------------------- */

// Generic pagination wrapper returned by many list endpoints
export interface Page<T> {
  items: T[];
  page: number; // 1-based current page
  size: number; // page size (≤100)
  total: number; // total items matching the query (across all pages)
}

/* -------------------------------------------------------------------------- */
/*                                  Entities                                  */
/* -------------------------------------------------------------------------- */

type UserRow = Tables<{ schema: "app" }, "users">;
type PeerRow = Tables<{ schema: "app" }, "peers">;
type AuditRow = Tables<{ schema: "app" }, "audit_log">;
// Roles are simple strings, so we map directly from roles.name
export type RoleName = Tables<{ schema: "app" }, "roles">["name"];

/* -------------------------------------------------------------------------- */
/*                                     DTOs                                   */
/* -------------------------------------------------------------------------- */

export interface UserDto
  extends Pick<UserRow, "id" | "email" | "status" | "peer_limit" | "created_at" | "requires_password_change"> {
  /**
   * Roles mapped through user_roles join. Example: ["user"], ["admin"].
   */
  roles: RoleName[];
}

export type PeerDto = Pick<
  PeerRow,
  | "id"
  | "public_key"
  | "status"
  | "friendly_name"
  | "claimed_at"
  | "revoked_at"
>;

export type AuditDto = Pick<
  AuditRow,
  "id" | "created_at" | "event_type" | "actor_id" | "subject_id" | "subject_table" | "metadata"
>;

/**
 * System-wide runtime configuration key/value pairs.
 * Currently exposed as a read-only map.
 */
export interface ConfigDto {
  [key: string]: string;
}

/** Result payload for /admin/import endpoint */
export interface ImportResultDto {
  files_imported: number;
  batch_id: string;
}

/* -------------------------------------------------------------------------- */
/*                               Auth Responses                               */
/* -------------------------------------------------------------------------- */

export interface AuthResponse {
  jwt: string;
  user: UserDto;
}

export interface ResetPasswordResponse {
  temporary_password: string;
}

/* -------------------------------------------------------------------------- */
/*                               Command Models                               */
/* -------------------------------------------------------------------------- */

export interface RegisterCommand {
  email: string;
  password: string;
}

export interface LoginCommand {
  email: string;
  password: string;
}

export type UpdateUserCommand = Partial<Pick<UserRow, "peer_limit" | "status">>;

export interface UpdatePeerCommand {
  friendly_name: string;
}

export interface AssignPeerCommand {
  user_id: string;
}

export interface ChangePasswordCommand {
  current_password: string;
  new_password: string;
}

// No body expected for FIFO claim, logout, revoke, etc. Therefore not modelled here.

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

// Utility helper to infer enum values for audit_event_enum, peer_status_enum, etc.
export type AuditEvent = Enums<{ schema: "app" }, "audit_event_enum">;
export type PeerStatus = Enums<{ schema: "app" }, "peer_status_enum">;
export type UserStatus = Enums<{ schema: "app" }, "user_status_enum">;

/* -------------------------------------------------------------------------- */
/*                             Admin View Models                              */
/* -------------------------------------------------------------------------- */

/**
 * Filters for admin peers list
 */
export interface PeerFiltersState {
  status?: PeerStatus;
  owner?: string; // UUID
}

/**
 * Extended peer DTO with owner email for admin view
 */
export interface PeerRowVM extends PeerDto {
  owner_email?: string | null;
  owner_id?: string | null;
}

/**
 * Complete state for admin peers view
 */
export interface AdminPeersVM {
  peers: PeerRowVM[];
  page: number;
  size: number;
  total: number;
  filters: PeerFiltersState;
  loading: boolean;
  error?: string;
}
