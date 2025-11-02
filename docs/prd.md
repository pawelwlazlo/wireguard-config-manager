# Product Requirements Document (PRD) - WireGuard Configuration Manager

## 1. Product Overview
WireGuard Configuration Manager is a web application that streamlines the distribution of pre-generated WireGuard VPN configuration files within a company. The system lets employees self-service download their configs while giving administrators control over user device limits, a complete audit of issued configurations, and an easy-to-use management panel.

## 2. User Problem
Today administrators manually hand out .conf files to users and keep paper or ad-hoc spreadsheets. The process is slow (>15 min per request), error-prone, and does not guarantee a complete issuance history. Users must wait for an admin, and the lack of a central register complicates audits.

## 3. Functional Requirements
- User registration restricted to e-mail domains defined in configuration.
- The first registered user is automatically granted the Administrator role.
- User login with a protected session (JWT / cookie).
- Users can change their own password (when they know the current one).
- Administrators can reset a user’s password (one-time temporary password).
- Configuration import: an admin triggers a scan of `PeerConfigDirectory`; valid files are stored in the DB with status **Available**.
- Configuration assignment:
  - User: “Get New Configuration” button (FIFO) up to their `peer_limit`.
  - Administrator: manual assignment to a user who is below their limit.
- Download: a user may download only their own configurations; the file is generated on-the-fly from encrypted data.
- Downloaded file name is based on **Friendly Name** (lowercase letters, digits, dash).
- Revocation:
  - A user can revoke their own peer.
  - An admin can revoke any peer or deactivate a user (cascades to all user peers).
  - Two-phase transaction: move file to `RevokedPeerDirectory` + update DB status, with rollback on failure.
- Limit management: default limit from `config.yaml`, override per user allowed by admin.
- Administrator views: user list, peer list, `Audit_Log`, read-only “Configuration” page.
- Full `Audit_Log` of events: login, claim, download, revoke, limit_change, import.
- Administrators can never view private keys or download user config files.
- UI shows persistent error banners if required directories are missing or have permission errors.

## 4. Product Boundaries
In scope for MVP:
- Distribution of existing WireGuard configurations.
- Basic limit management and auditing.
- Registration, login, download, import, assignment, revocation.
Out of scope for MVP:
- Automatic generation of new configurations.
- Hostname management for peers.
- Full CRUD for user and peer records.
- User-initiated password reset without admin.
- Integrations with external HR/SSO systems.

## 5. User Stories

### US-001 – Corporate-domain registration
Description: As a new user I want to register an account using my corporate e-mail so that I can access configurations.
Acceptance Criteria:
- E-mail address ends with one of the domains in `AcceptedDomains`.
- After registration the account status is **Active**.
- If this is the first registered account, the system assigns the **Admin** role.

### US-002 – Login
Description: As a user I want to log in with e-mail and password so that I can access the portal.
Acceptance Criteria:
- Correct credentials authenticate and create a session token.
- Incorrect credentials return a clear error message.
- Session expires after a configurable idle timeout.

### US-003 – Change password
Description: As a user I want to change my password when I know the old one to secure my account.
Acceptance Criteria:
- Form requires current password and the new password twice.
- Password meets complexity policy.
- After success the new password works and the old does not.

### US-004 – Admin-initiated password reset
Description: As an admin I want to reset a user’s password and receive a one-time temporary password.
Acceptance Criteria:
- Clicking “Reset” generates a random temporary password.
- The password is displayed only once to the admin.
- `Audit_Log` records a `RESET_PASSWORD` event.
- Temporary password expires after first login.

### US-005 – Configuration import
Description: As an admin I want to run an import scan to add new peers to the pool.
Acceptance Criteria:
- System scans `PeerConfigDirectory` and adds valid files as **Available**.
- Invalid or duplicate files are skipped and reported.
- `Audit_Log` records the number of imported files.

### US-006 – Automatic peer assignment (FIFO)
Description: As a user I want to click a button to quickly get a new configuration.
Acceptance Criteria:
- If user is below `peer_limit`, the oldest **Available** peer is assigned.
- Assignment is written to `Audit_Log` as `PEER_CLAIM`.
- User instantly sees the peer in their list.

### US-007 – Manual assignment by admin
Description: As an admin I want to manually assign an **Available** peer to a user who needs an additional configuration.
Acceptance Criteria:
- User picker shows only those below `peer_limit`.
- After assignment the peer status changes to **Active** and appears for the user.
- `Audit_Log` records `PEER_ASSIGN` with the admin’s ID.

### US-008 – Download configuration file
Description: As a user I want to download the .conf file for my peer so I can set up VPN.
Acceptance Criteria:
- “Download” button is visible only to the peer owner.
- File is generated on-the-fly from encrypted data.
- File name is `<friendly-name>.conf` (sanitised).
- `Audit_Log` records `PEER_DOWNLOAD`.

### US-009 – Set Friendly Name
Description: As a user I want to assign a friendly name to my peer so I can recognise it.
Acceptance Criteria:
- Edit field available on first download and in the list view.
- Validation allows lowercase letters, digits, dash (`^[a-z0-9-]+$`).
- Change is immediately saved in UI and DB.

### US-010 – Revoke own peer
Description: As a user I want to delete a peer I no longer use to free my limit.
Acceptance Criteria:
- Clicking “Delete” opens a confirmation dialog.
- On confirm, revocation moves the file and sets status **Inactive**.
- `Audit_Log` records `PEER_REVOKE` with type `USER`.

### US-011 – Deactivate user
Description: As an admin I want to deactivate a user when they leave the company.
Acceptance Criteria:
- Clicking “Deactivate” requires confirmation.
- User status becomes **Inactive**.
- All user peers are revoked as in US-010.
- `Audit_Log` records `USER_DEACTIVATE`.

### US-012 – Admin-initiated peer revocation
Description: As an admin I want to revoke any peer (e.g., compromised).
Acceptance Criteria:
- Action available from peer list.
- Peer is moved to `RevokedPeerDirectory` and status **Inactive**.
- `Audit_Log` records `PEER_REVOKE` with type `ADMIN`.

### US-013 – Increase peer limit
Description: As an admin I want to edit a user’s peer limit to fit their needs.
Acceptance Criteria:
- Form accepts positive values ≤ `MaxLimit` from config.
- New limit takes effect immediately.
- `Audit_Log` records `LIMIT_CHANGE`.

### US-014 – View user list
Description: As an admin I want to browse the list of users with filters.
Acceptance Criteria:
- Paginated table with columns: e-mail, role, limit, status, peers_count.
- Filters by status and domain.

### US-015 – View peer list
Description: As an admin I want to browse all peers with filters.
Acceptance Criteria:
- Table columns: public_key, owner, status, friendly_name, created_at.
- Filters by status and owner.

### US-016 – View audit history
Description: As an admin I want to browse the `Audit_Log` to track operations.
Acceptance Criteria:
- Read-only view with pagination.
- Filters by event type and date.

### US-017 – View system configuration
Description: As an admin I want to see the current app configuration to verify the environment.
Acceptance Criteria:
- Page displays values from `config.yaml` (excluding secrets).
- File/directory validation errors shown in a warning banner.

### US-018 – File access validation
Description: As the system I want to prevent file downloads by unauthorised sessions.
Acceptance Criteria:
- Download endpoint requires a valid session.
- Owner ID from token matches `peer.owner`.
- Unauthorised requests return 403 and are logged.

### US-019 – Handle invalid directories
Description: As the system I want to display a UI error when the import directory is unavailable.
Acceptance Criteria:
- If directory scan fails, an error banner with code is visible to admins.
- Banner disappears after a successful re-scan.

### US-020 – Peer issuance performance
Description: As a user I want to receive a configuration in less than 2 minutes from registration.
Acceptance Criteria:
- Average `TimeToFirstDownload` < 120 s measured by a system metric.

## 6. Success Metrics
1. Distribution automation: ≥ 95 % of `PEER_CLAIM` and `PEER_DOWNLOAD` events initiated by **User** roles.
2. Average Registration → First Download time < 120 s measured weekly.
3. `Audit_Log` contains 100 % of critical events; no missing entries in random audits.
4. Access control: 100 % of non-owner download attempts rejected and logged.
5. Stability: 99.5 % success rate for claim/download/revoke API calls (rolling 30 days).
