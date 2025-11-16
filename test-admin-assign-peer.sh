#!/bin/bash

# WireGuard Config Manager - Test Admin Assign Peer
# This script tests: admin login -> find user -> list available peers -> assign peer to user

set -e # Exit on error

API_URL="http://localhost:4321"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="SecureP@ss123"
TARGET_USER_EMAIL="test2@example.com"

echo "==========================================================="
echo "WireGuard Config Manager - Admin Assign Peer Test"
echo "==========================================================="
echo ""

# Step 1: Login as admin
echo "Step 1: Logging in as admin..."
echo "Email: $ADMIN_EMAIL"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "error"; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Login successful!"

# Extract JWT
JWT=$(echo "$LOGIN_RESPONSE" | jq -r .jwt)
USER_ROLES=$(echo "$LOGIN_RESPONSE" | jq -r '.user.roles[]')

echo "User: $(echo "$LOGIN_RESPONSE" | jq -r .user.email)"
echo "Roles: $USER_ROLES"
echo "JWT: ${JWT:0:50}..."
echo ""

# Verify user is admin
if [[ "$USER_ROLES" != *"admin"* ]]; then
  echo "❌ Error: User is not an admin!"
  exit 1
fi

# Step 2: Find target user by email
echo "Step 2: Finding user '$TARGET_USER_EMAIL'..."
echo "Calling GET $API_URL/api/v1/admin/users"
echo ""

USERS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/admin/users?size=100" \
  -H "Authorization: Bearer $JWT")

if echo "$USERS_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to fetch users!"
  echo "$USERS_RESPONSE" | jq .
  exit 1
fi

# Find user by email
TARGET_USER_ID=$(echo "$USERS_RESPONSE" | jq -r ".items[] | select(.email == \"$TARGET_USER_EMAIL\") | .id")

if [ -z "$TARGET_USER_ID" ] || [ "$TARGET_USER_ID" == "null" ]; then
  echo "❌ User '$TARGET_USER_EMAIL' not found!"
  echo ""
  echo "Available users:"
  echo "$USERS_RESPONSE" | jq -r '.items[] | "  - \(.email) (ID: \(.id))"'
  echo ""
  echo "Tip: Make sure the user is registered. You can register with:"
  echo "  curl -X POST $API_URL/api/v1/auth/register \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"email\": \"$TARGET_USER_EMAIL\", \"password\": \"password123\"}'"
  exit 1
fi

echo "✅ Found user: $TARGET_USER_EMAIL"
echo "   User ID: $TARGET_USER_ID"
echo ""

# Step 3: Get available peers
echo "Step 3: Fetching available peers..."
echo "Calling GET $API_URL/api/v1/admin/peers?status=available"
echo ""

PEERS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/admin/peers?status=available&size=10" \
  -H "Authorization: Bearer $JWT")

if echo "$PEERS_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to fetch peers!"
  echo "$PEERS_RESPONSE" | jq .
  exit 1
fi

# Count available peers
AVAILABLE_COUNT=$(echo "$PEERS_RESPONSE" | jq -r '.total')

if [ "$AVAILABLE_COUNT" -eq 0 ]; then
  echo "❌ No available peers to assign!"
  echo ""
  echo "Tip: Import peer configurations first using:"
  echo "  ./test-admin-import.sh"
  exit 1
fi

echo "✅ Found $AVAILABLE_COUNT available peer(s)"

# Get first available peer ID
PEER_ID=$(echo "$PEERS_RESPONSE" | jq -r '.items[0].id')
PEER_PUBLIC_KEY=$(echo "$PEERS_RESPONSE" | jq -r '.items[0].public_key')

echo "   Selected peer ID: $PEER_ID"
echo "   Public key: $PEER_PUBLIC_KEY"
echo ""

# Step 4: Assign peer to user
echo "Step 4: Assigning peer to user..."
echo "Calling POST $API_URL/api/v1/admin/peers/$PEER_ID/assign"
echo ""

ASSIGN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/admin/peers/$PEER_ID/assign" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$TARGET_USER_ID\"
  }")

# Extract status code and body
HTTP_STATUS=$(echo "$ASSIGN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ASSIGN_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Peer assigned successfully!"
  echo "$RESPONSE_BODY" | jq .
  
  ASSIGNED_TO=$(echo "$RESPONSE_BODY" | jq -r '.assigned_to_name')
  PEER_STATUS=$(echo "$RESPONSE_BODY" | jq -r '.status')
  ASSIGNED_AT=$(echo "$RESPONSE_BODY" | jq -r '.assigned_at')
  
  echo ""
  echo "Summary:"
  echo "  Peer ID: $PEER_ID"
  echo "  Public Key: $PEER_PUBLIC_KEY"
  echo "  Assigned to: $ASSIGNED_TO ($TARGET_USER_EMAIL)"
  echo "  Status: $PEER_STATUS"
  echo "  Assigned at: $ASSIGNED_AT"
else
  echo "❌ Failed to assign peer!"
  echo "$RESPONSE_BODY" | jq .
  
  # Show helpful error messages
  if echo "$RESPONSE_BODY" | grep -q "LimitExceeded"; then
    echo ""
    echo "Tip: The user has reached their peer limit"
  elif echo "$RESPONSE_BODY" | grep -q "PeerNotAvailable"; then
    echo ""
    echo "Tip: The peer is not available (already assigned or inactive)"
  elif echo "$RESPONSE_BODY" | grep -q "NotFound"; then
    echo ""
    echo "Tip: The peer or user was not found"
  fi
  
  exit 1
fi

echo ""
echo "==========================================================="
echo "Test completed successfully!"
echo "==========================================================="

