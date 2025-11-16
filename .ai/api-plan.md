# REST API Plan

## 1. Resources

| Resource | Backing Table | Description |
|----------|---------------|-------------|
| User | `users` | Application user authenticated via Supabase Auth. |
| Role | `roles` | Role names (`admin`, `user`, etc.). |
| UserRole | `user_roles` | N-to-M link between users and roles. |
| Peer | `peers` | WireGuard peer configuration objects. |
| AuditLog | `audit_log` | Immutable audit trail of significant events. |
| AcceptedDomain | `accepted_domains` | Whitelisted e-mail domains for self-registration. |
| ConfigKV | `config_kv` | Key/value runtime configuration. |
| PasswordResetToken | `password_reset_tokens` | One-time admin-generated reset tokens. |
| UserLimitHistory | `user_limit_history` | Historical changes of `peer_limit`. |
| ImportBatch | `import_batches` | Metadata for bulk peer imports. |

---

## 2. Endpoints

Below tables list only the **public HTTP interface**. All endpoints are **versioned** under `/api/v1`.

### 2.1 Authentication

| Method | Path | Description | Request Body | Success (200) | Errors |
|--------|------|-------------|--------------|---------------|--------|
| POST | `/api/v1/auth/register` | Self-service registration (corporate domain only). | `{ "email", "password" }` | `{ "jwt", "user" }` | 400 InvalidDomain, 409 EmailExists |
| POST | `/api/v1/auth/login` | Login with e-mail & password. | `{ "email", "password" }` | `{ "jwt", "user" }` | 400 InvalidCredentials |
| POST | `/api/v1/auth/logout` | Invalidate refresh token. | – | 204 No Content | 401 Unauthenticated |

*Authentication is delegated to Supabase Auth; these thin wrappers unify error handling and metrics.*

### 2.2 Users (Admin-only unless stated)

| Method | Path | Description | QS / Body | Success | Errors |
|--------|------|-------------|-----------|---------|--------|
| GET | `/api/v1/users/me` | Get own profile incl. `peer_limit`, `roles`. | – | UserDto | 401 |
| GET | `/api/v1/admin/users` | Paginated user list. Filters: `status`, `domain`, `page`, `size`. | – | `Page<UserDto>` | 403 Forbidden |
| PATCH | `/api/v1/admin/users/{id}` | Update peer_limit or status. | `{ "peer_limit?", "status?" }` | Updated UserDto | 400 Validation, 404 |
| POST | `/api/v1/admin/users/{id}/reset-password` | Generate temporary password. | – | `{ "temporary_password" }` | 404 |

### 2.3 Peers

| Method | Path | Description | QS / Body | Success | Errors |
|--------|------|-------------|-----------|---------|--------|
| GET | `/api/v1/peers` | List own peers. Filters: `status`, `page`, `size`. | – | `Page<PeerDto>` | 401 |
| POST | `/api/v1/peers/claim` | Automatic FIFO claim (US-006). | – | PeerDto | 400 LimitExceeded, 404 NoAvailable |
| GET | `/api/v1/peers/{id}` | Get single peer (owner or admin). | – | PeerDto | 403, 404 |
| GET | `/api/v1/peers/{id}/download` | Secure download of `.conf`. | – | `file/*` | 403, 404 |
| PATCH | `/api/v1/peers/{id}` | Update friendly name. | `{ "friendly_name" }` | PeerDto | 400 Validation |
| DELETE | `/api/v1/peers/{id}` | Revoke own peer (US-010). | – | 204 | 403, 404 |
| POST | `/api/v1/admin/peers/{id}/assign` | Manual admin assignment to user. | `{ "user_id" }` | PeerDto | 400 LimitExceeded |
| DELETE | `/api/v1/admin/peers/{id}` | Admin revocation (US-012). | – | 204 | 404 |
| GET | `/api/v1/admin/peers` | Global peer list with filters `status`, `owner`, `page`, `size`. | – | `Page<PeerDto>` | 403 |

### 2.4 Audit Log (Admin)

| Method | Path | Description | QS | Success | Errors |
|--------|------|-------------|----|---------|--------|
| GET | `/api/v1/admin/audit` | Paginated audit log. Filters: `event_type`, `from`, `to`, `page`, `size`. | – | `Page<AuditDto>` | 403 |

### 2.5 Import & System

| Method | Path | Description | Body | Success | Errors |
|--------|------|-------------|------|---------|--------|
| POST | `/api/v1/admin/import` | Trigger directory scan & import (US-005). | – | `{ "files_imported", "batch_id" }` | 500 DirError |
| GET | `/api/v1/admin/config` | Read-only system configuration (US-017). | – | `ConfigDto` | 403 |

---

## 3. Authentication & Authorization

* **Scheme**: Bearer JWT issued by Supabase Auth.
* **Session**: Access & Refresh tokens; Access sent as `Authorization: Bearer` header.
* **Roles**: Derived from `user_roles` join. Middleware attaches `role` claim.
* **RLS Alignment**: Every endpoint additionally filtered by Postgres RLS so that leaked tokens cannot bypass row-level policies.
* **Permissions Matrix**

| Endpoint Group | Auth | Role Requirements |
|----------------|------|-------------------|
| `/auth/*` | None (register/login) | – |
| `/peers/*` | Required | `user` or `admin` (owner restriction inside) |
| `/admin/*` | Required | `admin` |

---

## 4. Validation & Business Logic

### 4.1 Validation Rules (selection)

| Field | Rule | Source |
|-------|------|--------|
| `email` | Must match domain in `accepted_domains` and regex in DB check. | DB §1.1 `email` CHECK |
| `friendly_name` | Regex `^[a-z0-9-]+$`, length ≤ 63, unique per owner. | DB §1.4 line 38 |
| `peer_limit` | Positive integer ≤ `config_kv['max_peer_limit']`. | PRD US-013 |
| `password` | Complexity policy (configurable). | PRD US-003 |

### 4.2 Business Logic Mapping

| PRD Feature | Endpoint(s) | Notes |
|-------------|-------------|-------|
| US-001 Registration | `POST /auth/register` | Auto-grant first user admin via DB trigger. |
| US-002 Login | `POST /auth/login` | – |
| US-003 Change password | Supabase `/user` endpoint (not duplicated here). |
| US-004 Admin reset | `POST /admin/users/{id}/reset-password` | Generates record in `password_reset_tokens`. |
| US-005 Import | `POST /admin/import` | Runs server-side job; logs `IMPORT`. |
| US-006 FIFO claim | `POST /peers/claim` | Transaction: `SELECT … FOR UPDATE SKIP LOCKED`. |
| US-007 Manual assign | `POST /admin/peers/{id}/assign` | Checks target user limit. |
| US-008 Download | `GET /peers/{id}/download` | Streams decrypted conf, logs event. |
| US-009 Friendly name | `PATCH /peers/{id}` | – |
| US-010 Revoke own | `DELETE /peers/{id}` | Moves file, updates status. |
| US-011 Deactivate user | `PATCH /admin/users/{id}` with `status=inactive` | Cascade revoke in DB trigger. |
| US-012 Admin revoke | `DELETE /admin/peers/{id}` | – |
| US-013 Edit limit | `PATCH /admin/users/{id}` | Inserts into `user_limit_history`. |
| US-014 List users | `GET /admin/users` | Pagination & filters. |
| US-015 List peers | `GET /admin/peers` | – |
| US-016 Audit history | `GET /admin/audit` | – |
| US-017 System config | `GET /admin/config` | – |
| US-018 Secure download | Handled by auth + owner check + RLS. |
| US-019 Directory errors | `POST /admin/import` returns 500 DirError. |
| US-020 Performance | FIFO claim uses indexed `(status, imported_at)` and SKIP LOCKED. |

### 4.3 Pagination / Filtering / Sorting

* Pagination parameters: `page` (1-based), `size` (≤100, default 20).
* Sorting: `sort` query parameter `field:asc|desc`, limited to whitelisted columns.

### 4.4 Rate Limiting & Security

| Measure | Level |
|---------|-------|
| Global rate limit 100 req/min per IP (reverse proxy). | Edge |
| Auth endpoints stricter: 10 req/min per IP. | Edge |
| JWT expiration 15 min, refresh 7 days. | Auth |
| All responses include `Content-Security-Policy`, `X-Content-Type-Options` headers. | API |
| Sensitive audit writes wrapped in DB transaction with `SET LOCAL` to pass actor ID. | DB |

---

## 5. DTO Schemas (abridged)

```jsonc
// UserDto
{
  "id": "uuid",
  "email": "string",
  "status": "active | inactive",
  "peer_limit": 3,
  "roles": ["user"],
  "created_at": "ISO8601"
}

// PeerDto
{
  "id": "uuid",
  "public_key": "string",
  "status": "available | active | inactive",
  "friendly_name": "my-laptop",
  "claimed_at": "ISO8601 | null",
  "revoked_at": "ISO8601 | null"
}
```

*Full OpenAPI specification to be generated automatically from TypeScript typings in a follow-up task.*
