#!/bin/bash

# WireGuard Config Manager - Admin Setup & Import
# This script sets up the test environment:
# 1. Adds example.com as accepted domain
# 2. Creates admin account
# 3. Imports WireGuard peer configurations

set -e # Exit on error

API_URL="http://localhost:4321"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="SecureP@ss123"
DOMAIN="example.com"

echo "============================================================"
echo "WireGuard Config Manager - Admin Setup & Import"
echo "============================================================"
echo ""

# Step 1: Add accepted domain to database
echo "Step 1: Adding accepted domain to database..."
echo "Domain: $DOMAIN"
echo ""

# Use psql to add domain to local Supabase
# Default Supabase local connection: postgresql://postgres:postgres@localhost:54322/postgres
ADD_DOMAIN_SQL="INSERT INTO app.accepted_domains (domain) VALUES ('$DOMAIN') ON CONFLICT (domain) DO NOTHING;"

PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "$ADD_DOMAIN_SQL" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Domain added/verified in database"
else
  echo "⚠️  Warning: Could not connect to Supabase database"
  echo "Make sure Supabase is running: npx supabase start"
  echo ""
  echo "If database is running on different port, add domain manually:"
  echo "  PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c \"$ADD_DOMAIN_SQL\""
  echo ""
  read -p "Do you want to continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo ""

# Step 2: Register admin user
echo "Step 2: Registering admin user..."
echo "Email: $ADMIN_EMAIL"
echo ""

REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

# Extract status code and body
HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "201" ]; then
  echo "✅ Admin user registered successfully!"
  echo "$RESPONSE_BODY" | jq .
  
  USER_ROLES=$(echo "$RESPONSE_BODY" | jq -r '.user.roles | join(", ")')
  echo ""
  echo "User created:"
  echo "  Email: $ADMIN_EMAIL"
  echo "  Roles: $USER_ROLES"
  
  # Verify user is admin (first user should be auto-assigned admin role)
  if [[ "$USER_ROLES" != *"admin"* ]]; then
    echo ""
    echo "⚠️  Warning: User was not assigned admin role!"
    echo "This might be because another user already exists."
    echo "Continuing anyway..."
  fi
elif [ "$HTTP_STATUS" == "409" ]; then
  echo "⚠️  User already exists (409 Conflict)"
  echo "$RESPONSE_BODY" | jq .
  echo ""
  echo "This is OK - continuing with existing user..."
else
  echo "❌ Failed to register admin user!"
  echo "HTTP Status: $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
  echo ""
  
  # Show helpful error messages
  if echo "$RESPONSE_BODY" | grep -q "InvalidDomain"; then
    echo "Tip: Domain '$DOMAIN' is not in accepted_domains table"
    echo "Add it manually:"
    echo "  psql -d postgres -c \"INSERT INTO app.accepted_domains (domain) VALUES ('$DOMAIN');\""
  fi
  
  exit 1
fi
echo ""

# Step 3: Import peers using existing script
echo "Step 3: Importing WireGuard peers..."
echo "Calling ./test-admin-import.sh"
echo ""

if [ ! -f "./test-admin-import.sh" ]; then
  echo "❌ Error: test-admin-import.sh not found!"
  echo "Make sure you're running this script from the project root."
  exit 1
fi

# Make sure the script is executable
chmod +x ./test-admin-import.sh

# Run the import script
./test-admin-import.sh

echo ""
echo "============================================================"
echo "Setup completed successfully!"
echo "============================================================"
echo ""
echo "Summary:"
echo "  Domain: $DOMAIN ✅"
echo "  Admin user: $ADMIN_EMAIL ✅"
echo "  Peers imported: ✅"
echo ""
echo "You can now run other test scripts:"
echo "  ./test-admin-assign-peer.sh"
echo "  ./test-user-peers.sh"

