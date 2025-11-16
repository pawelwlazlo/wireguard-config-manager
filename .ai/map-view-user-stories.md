<widok>

2.1 Login

<user_stories>

US-002 – Login – "As a user I want to log in with e-mail and password so that I can access the portal."

</user_stories>

<api_endpoints>

POST /api/v1/auth/login – User login

</api_endpoints>

</widok>

<widok>

2.2 Registration

<user_stories>

US-001 – Corporate-domain registration – "As a new user I want to register an account using my corporate e-mail so that I can access configurations."

</user_stories>

<api_endpoints>

POST /api/v1/auth/register – User registration

</api_endpoints>

</widok>

<widok>

2.3 Change Password

<user_stories>

US-003 – Change password – "As a user I want to change my password when I know the old one to secure my account."

</user_stories>

<api_endpoints>

(Supabase auth `/user` endpoint – handled outside custom REST layer)

</api_endpoints>

</widok>

<widok>

2.4 Dashboard (User)

<user_stories>

US-006 – Automatic peer assignment (FIFO)
US-008 – Download configuration file
US-009 – Set Friendly Name
US-010 – Revoke own peer

</user_stories>

<api_endpoints>

GET  /api/v1/users/me – Current user profile
GET  /api/v1/peers – List own peers
POST /api/v1/peers/claim – Claim new peer (FIFO)
GET  /api/v1/peers/{id}/download – Download .conf file
PATCH /api/v1/peers/{id} – Update friendly name
DELETE /api/v1/peers/{id} – Revoke own peer

</api_endpoints>

</widok>

<widok>

2.5 Global Error / Access Denied (`/error`, `/403`)

<user_stories>

Brak dedykowanych historyjek – widok obsługuje globalne błędy 401/403/404/500 zgodnie z *Centralny error handler*.

</user_stories>

<api_endpoints>

N/A – renderowany po otrzymaniu błędu HTTP z dowolnego endpointu.

</api_endpoints>

</widok>

<widok>

2.6 Admin – Users Management (`/admin/users.astro`)

<user_stories>

US-004 – Admin-initiated password reset
US-011 – Deactivate user
US-013 – Increase peer limit
US-014 – View user list

</user_stories>

<api_endpoints>

GET   /api/v1/admin/users – Paginated user list
PATCH /api/v1/admin/users/{id} – Update peer_limit or status
POST  /api/v1/admin/users/{id}/reset-password – Generate temporary password

</api_endpoints>

</widok>

<widok>

2.7 Admin – Peers Management (`/admin/peers.astro`)

<user_stories>

US-007 – Manual assignment by admin
US-012 – Admin-initiated peer revocation
US-015 – View peer list

</user_stories>

<api_endpoints>

GET    /api/v1/admin/peers – Global peer list
POST   /api/v1/admin/peers/{id}/assign – Assign peer to user
DELETE /api/v1/admin/peers/{id} – Revoke peer (admin)

</api_endpoints>

</widok>

<widok>

2.8 Admin – Audit Log (`/admin/audit.astro`)

<user_stories>

US-016 – View audit history

</user_stories>

<api_endpoints>

GET /api/v1/admin/audit – Paginated audit log

</api_endpoints>

</widok>

<widok>

2.9 Admin – Import (`/admin/import.astro`)

<user_stories>

US-005 – Configuration import
US-019 – Handle invalid directories

</user_stories>

<api_endpoints>

POST /api/v1/admin/import – Trigger directory scan & import

</api_endpoints>

</widok>

<widok>

2.10 Admin – Config (`/admin/config.astro`)

<user_stories>

US-017 – View system configuration

</user_stories>

<api_endpoints>

GET /api/v1/admin/config – Read-only system configuration

</api_endpoints>

</widok>
