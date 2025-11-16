# WireGuard Config Manager - Testing Guide

This guide describes the available test scripts for validating the WireGuard Config Manager API.

## Prerequisites

1. **Start the development server:**
```bash
npm run dev
```

2. **Set up environment variables in `.env`:**
```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Import Configuration
IMPORT_DIR=/path/to/wireguard/configs
ENCRYPTION_KEY=your-32-character-hex-key

# Accepted Domains
ACCEPTED_DOMAINS=example.com
```

3. **Create WireGuard config files** in `IMPORT_DIR`:
```bash
mkdir -p /path/to/wireguard/configs

# Create sample configs (replace with real configs)
cat > /path/to/wireguard/configs/peer1.conf <<EOF
[Interface]
PrivateKey = <private-key>
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = <server-public-key>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF
```

## Test Scripts

### 0. Admin Setup & Import (`test-admin-setup.sh`) 🆕

**Purpose:** Complete setup of test environment - domain, admin user, and peer import in one command.

**What it does:**
- ✅ Adds `example.com` to accepted domains
- ✅ Registers admin user (`admin@example.com`)
- ✅ Imports WireGuard peers (calls `test-admin-import.sh`)

**Usage:**
```bash
./test-admin-setup.sh
```

**Prerequisites:**
- Supabase local running (`npx supabase start`)
- Dev server running (`npm run dev`)
- WireGuard config files in `IMPORT_DIR`
- `ENCRYPTION_KEY` set in `.env`

**Expected Output:**
```
Step 1: Adding accepted domain to database...
✅ Domain added/verified

Step 2: Registering admin user...
✅ Admin user registered successfully!

Step 3: Importing WireGuard peers...
✅ Import successful!

Setup completed successfully!
```

**Note:** This is the **recommended first step** for setting up a fresh test environment. It handles all initial setup automatically.

---

### 1. User Registration Test (`test-register-user.sh`) 

**Purpose:** Test regular user registration with domain validation.

**What it tests:**
- ✅ User registration endpoint
- ✅ Domain whitelist validation
- ✅ Role assignment (should be "user", not "admin")
- ✅ Conflict handling (duplicate email)

**Usage:**
```bash
# With default email (user@example.com)
./test-register-user.sh

# With custom email and password
./test-register-user.sh user2@example.com MyPassword123

# With custom email only (uses default password)
./test-register-user.sh test@example.com
```

**Expected Output:**
```
HTTP Status: 201

✅ User registered successfully!
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "status": "active",
    "peer_limit": 10,
    "roles": ["user"]
  }
}

Summary:
  Email: user@example.com
  Roles: user
  Peer limit: 10

✅ User has correct role (user)
```

**Notes:**
- First registered user automatically gets "admin" role
- Subsequent users get "user" role
- Domain must be in `accepted_domains` table

---

### 2. Admin Import Test (`test-admin-import.sh`)

**Purpose:** Test bulk import of WireGuard configurations by admin.

**What it tests:**
- ✅ Admin authentication
- ✅ Import endpoint authorization
- ✅ Bulk peer import from directory
- ✅ Batch tracking

**Usage:**
```bash
./test-admin-import.sh
```

**Prerequisites:**
- Admin user registered (`admin@example.com`)
- WireGuard config files in `IMPORT_DIR`
- `ENCRYPTION_KEY` set in `.env`

**Expected Output:**
```
Step 1: Logging in as admin...
✅ Login successful!

Step 2: Importing WireGuard peers...
✅ Import successful!

Summary:
  Files imported: 5
  Batch ID: 123e4567-e89b-12d3-a456-426614174000
```

---

### 2. Admin Assign Peer Test (`test-admin-assign-peer.sh`)

**Purpose:** Test manual peer assignment by admin to a specific user.

**What it tests:**
- ✅ Admin authentication
- ✅ User lookup by email
- ✅ Available peers listing
- ✅ Manual peer assignment
- ✅ Peer limit validation

**Usage:**
```bash
./test-admin-assign-peer.sh
```

**Prerequisites:**
- Admin user registered (`admin@example.com`)
- Target user registered (`test2@example.com`)
- Available peers imported (run `test-admin-import.sh` first)

**Expected Output:**
```
Step 1: Logging in as admin...
✅ Login successful!

Step 2: Finding user 'test2@example.com'...
✅ Found user: test2@example.com

Step 3: Fetching available peers...
✅ Found 5 available peer(s)

Step 4: Assigning peer to user...
✅ Peer assigned successfully!

Summary:
  Peer ID: 987fcdeb-51a2-43f7-9abc-def012345678
  Public Key: 10.0.0.2/32
  Assigned to: test2@example.com (test2@example.com)
  Status: active
```

---

### 3. User Peer Operations Test (`test-user-peers.sh`)

**Purpose:** Test full peer lifecycle from regular user perspective.

**What it tests:**
- ✅ User authentication
- ✅ User profile retrieval
- ✅ List own peers (RLS enforcement)
- ✅ Automatic peer claiming (FIFO)
- ✅ Peer details retrieval
- ✅ Friendly name update
- ✅ Configuration download
- ✅ Access control (403 on admin endpoints)

**Usage:**
```bash
./test-user-peers.sh
```

**Prerequisites:**
- User registered (`test2@example.com`)
- Either:
  - Available peers to claim, OR
  - Peers already assigned to this user

**Expected Output:**
```
Step 1: Logging in as regular user...
✅ Login successful!
User: test2@example.com
Peer limit: 3

Step 2: Fetching user profile...
✅ Profile fetched successfully!

Step 3: Listing own peers...
✅ Peers fetched successfully!
Active peers: 1 / 3

Step 4: Claiming a new peer...
✅ Peer claimed successfully!

Step 5: Fetching peer details...
✅ Peer details fetched successfully!

Step 6: Updating peer friendly name...
✅ Peer updated successfully!

Step 7: Downloading peer configuration...
✅ Configuration downloaded successfully!
File saved to: /tmp/wireguard-test-...

Step 8: Testing access control...
✅ Access control working correctly! (403 Forbidden)

All tests completed successfully!
```

---

## Complete Test Workflow

### Quick Setup (Recommended)

Use the automated setup script for a fresh environment:

```bash
# One command to set up everything
./test-admin-setup.sh
```

This will:
1. Add `example.com` as accepted domain
2. Register admin user
3. Import WireGuard peers

Then run additional tests:

```bash
# Register a regular user (simple script)
./test-register-user.sh test2@example.com

# OR register manually with curl
curl -X POST http://localhost:4321/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test2@example.com", "password": "SecureP@ss123"}'

# Test admin assigning peer to user
./test-admin-assign-peer.sh

# Test regular user operations
./test-user-peers.sh
```

### Manual Setup (Step by Step)

To test the entire system from scratch manually:

```bash
# 1. Add accepted domain (via Supabase CLI or psql)
echo "INSERT INTO app.accepted_domains (domain) VALUES ('example.com');" | npx supabase db execute --stdin

# 2. Register admin user (first user becomes admin automatically)
./test-register-user.sh admin@example.com

# 3. Register regular user
./test-register-user.sh test2@example.com

# 4. Run admin import test
./test-admin-import.sh

# 5. Run admin assign test
./test-admin-assign-peer.sh

# 6. Run user operations test
./test-user-peers.sh
```

## Common Issues

### Issue: "No available peers to claim"
**Solution:** Run `./test-admin-import.sh` to import peers first.

### Issue: "User not found"
**Solution:** Register the user:
```bash
curl -X POST http://localhost:4321/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test2@example.com", "password": "SecureP@ss123"}'
```

### Issue: "IMPORT_DIR not configured"
**Solution:** Add to `.env`:
```bash
IMPORT_DIR=/path/to/wireguard/configs
```

### Issue: "Email domain not accepted"
**Solution:** Add domain to `.env`:
```bash
ACCEPTED_DOMAINS=example.com
```

Or add to database:
```sql
INSERT INTO app.accepted_domains (domain) VALUES ('example.com');
```

### Issue: "Failed to create import batch: foreign key violation"
**Solution:** The user ID doesn't exist. Make sure you're logged in as a valid user.

### Issue: "Peer limit exceeded"
**Solution:** Admin can increase user's limit:
```bash
curl -X PATCH http://localhost:4321/api/v1/admin/users/{user_id} \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"peer_limit": 10}'
```

## Security Notes

### Authentication
- All endpoints except `/auth/register` and `/auth/login` require authentication
- JWT tokens are issued on login and must be sent as `Authorization: Bearer <token>`
- Access tokens expire after 15 minutes (configurable in Supabase)

### Authorization
- **Admin endpoints** (`/api/v1/admin/*`):
  - Require `admin` role
  - Use service_role client (bypass RLS)
  - Full access to all resources

- **User endpoints** (`/api/v1/peers/*`, `/api/v1/users/me`):
  - Require authentication
  - Use user JWT client (RLS enforced)
  - Access only to own resources

### Row Level Security (RLS)
- Regular users can only access their own peers
- Attempting to access another user's peer returns `404 Not Found` (not `403 Forbidden` to avoid information disclosure)
- Admin operations bypass RLS using service_role key

## Performance Testing

To test concurrent peer claims (FIFO with SKIP LOCKED):

```bash
# Run multiple claim requests in parallel
for i in {1..10}; do
  curl -X POST http://localhost:4321/api/v1/peers/claim \
    -H "Authorization: Bearer $USER_JWT" &
done
wait
```

Each request should get a unique peer without conflicts.

## Cleanup

To reset the database and start fresh:

```bash
# Reset Supabase local database
npx supabase db reset

# Re-register users and run tests again
```

## Next Steps

- [ ] Implement audit log viewer
- [ ] Add rate limiting tests
- [ ] Test password reset flow
- [ ] Test user deactivation cascade
- [ ] Load testing with multiple concurrent users

