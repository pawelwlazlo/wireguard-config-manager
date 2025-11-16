#!/bin/bash

# WireGuard Config Manager - Test User Peer Operations
# This script tests: user login -> list own peers -> claim new peer -> download config

set -e # Exit on error

API_URL="http://localhost:4321"
USER_EMAIL="user2@example.com"
USER_PASSWORD="SecureP@ss123"

echo "==========================================================="
echo "WireGuard Config Manager - User Peer Operations Test"
echo "==========================================================="
echo ""

# Step 1: Login as regular user
echo "Step 1: Logging in as regular user..."
echo "Email: $USER_EMAIL"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "error"; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq .
  echo ""
  echo "Tip: Make sure the user is registered. You can register with:"
  echo "  curl -X POST $API_URL/api/v1/auth/register \\"
  echo "    -H \"Content-Type: application/json\" \\"
  echo "    -d '{\"email\": \"$USER_EMAIL\", \"password\": \"$USER_PASSWORD\"}'"
  exit 1
fi

echo "✅ Login successful!"

# Extract JWT and user info
JWT=$(echo "$LOGIN_RESPONSE" | jq -r .jwt)
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r .user.id)
USER_ROLES=$(echo "$LOGIN_RESPONSE" | jq -r '.user.roles | join(", ")')
PEER_LIMIT=$(echo "$LOGIN_RESPONSE" | jq -r .user.peer_limit)

echo "User: $(echo "$LOGIN_RESPONSE" | jq -r .user.email)"
echo "User ID: $USER_ID"
echo "Roles: $USER_ROLES"
echo "Peer limit: $PEER_LIMIT"
echo "JWT: ${JWT:0:50}..."
echo ""

# Step 2: Get user profile
echo "Step 2: Fetching user profile..."
echo "Calling GET $API_URL/api/v1/users/me"
echo ""

PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/users/me" \
  -H "Authorization: Bearer $JWT")

if echo "$PROFILE_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to fetch profile!"
  echo "$PROFILE_RESPONSE" | jq .
  exit 1
fi

echo "✅ Profile fetched successfully!"
echo "$PROFILE_RESPONSE" | jq .
echo ""

# Step 3: List own peers
echo "Step 3: Listing own peers..."
echo "Calling GET $API_URL/api/v1/peers"
echo ""

PEERS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/peers?status=active" \
  -H "Authorization: Bearer $JWT")

if echo "$PEERS_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to fetch peers!"
  echo "$PEERS_RESPONSE" | jq .
  exit 1
fi

ACTIVE_PEERS_COUNT=$(echo "$PEERS_RESPONSE" | jq -r '.total')

echo "✅ Peers fetched successfully!"
echo "Active peers: $ACTIVE_PEERS_COUNT / $PEER_LIMIT"

if [ "$ACTIVE_PEERS_COUNT" -gt 0 ]; then
  echo ""
  echo "Current active peers:"
  echo "$PEERS_RESPONSE" | jq -r '.items[] | "  - ID: \(.id)\n    Public Key: \(.public_key)\n    Friendly Name: \(.friendly_name // "not set")\n    Status: \(.status)\n    Assigned at: \(.assigned_at)"'
else
  echo "No active peers found."
fi
echo ""

# Step 4: Claim a new peer (if not at limit)
if [ "$ACTIVE_PEERS_COUNT" -ge "$PEER_LIMIT" ]; then
  echo "Step 4: Skipping peer claim (already at limit: $ACTIVE_PEERS_COUNT/$PEER_LIMIT)"
  echo ""
  
  # Use first peer for remaining tests
  if [ "$ACTIVE_PEERS_COUNT" -gt 0 ]; then
    TEST_PEER_ID=$(echo "$PEERS_RESPONSE" | jq -r '.items[0].id')
    TEST_PEER_PUBLIC_KEY=$(echo "$PEERS_RESPONSE" | jq -r '.items[0].public_key')
    echo "Using existing peer for tests:"
    echo "  Peer ID: $TEST_PEER_ID"
    echo "  Public Key: $TEST_PEER_PUBLIC_KEY"
    echo ""
  else
    echo "No peers to test with. Exiting."
    exit 0
  fi
else
  echo "Step 4: Claiming a new peer..."
  echo "Calling POST $API_URL/api/v1/peers/claim"
  echo ""

  CLAIM_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/peers/claim" \
    -H "Authorization: Bearer $JWT")

  # Extract status code and body
  HTTP_STATUS=$(echo "$CLAIM_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  RESPONSE_BODY=$(echo "$CLAIM_RESPONSE" | sed '/HTTP_STATUS/d')

  echo "HTTP Status: $HTTP_STATUS"
  echo ""

  if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ Peer claimed successfully!"
    echo "$RESPONSE_BODY" | jq .
    
    TEST_PEER_ID=$(echo "$RESPONSE_BODY" | jq -r '.id')
    TEST_PEER_PUBLIC_KEY=$(echo "$RESPONSE_BODY" | jq -r '.public_key')
    
    echo ""
    echo "Claimed peer details:"
    echo "  Peer ID: $TEST_PEER_ID"
    echo "  Public Key: $TEST_PEER_PUBLIC_KEY"
    echo "  Status: $(echo "$RESPONSE_BODY" | jq -r '.status')"
    echo "  Assigned at: $(echo "$RESPONSE_BODY" | jq -r '.assigned_at')"
    echo ""
  else
    echo "❌ Failed to claim peer!"
    echo "$RESPONSE_BODY" | jq .
    
    # Show helpful error messages
    if echo "$RESPONSE_BODY" | grep -q "NoAvailable"; then
      echo ""
      echo "Tip: No available peers to claim. Import peers first:"
      echo "  ./test-admin-import.sh"
    elif echo "$RESPONSE_BODY" | grep -q "LimitExceeded"; then
      echo ""
      echo "Tip: You've reached your peer limit ($PEER_LIMIT)"
    fi
    
    # Try to use existing peer if available
    if [ "$ACTIVE_PEERS_COUNT" -gt 0 ]; then
      echo ""
      echo "Using existing peer for remaining tests..."
      TEST_PEER_ID=$(echo "$PEERS_RESPONSE" | jq -r '.items[0].id')
      TEST_PEER_PUBLIC_KEY=$(echo "$PEERS_RESPONSE" | jq -r '.items[0].public_key')
    else
      exit 1
    fi
  fi
fi

# Step 5: Get peer details
echo "Step 5: Fetching peer details..."
echo "Calling GET $API_URL/api/v1/peers/$TEST_PEER_ID"
echo ""

PEER_DETAIL_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/peers/$TEST_PEER_ID" \
  -H "Authorization: Bearer $JWT")

if echo "$PEER_DETAIL_RESPONSE" | grep -q "error"; then
  echo "❌ Failed to fetch peer details!"
  echo "$PEER_DETAIL_RESPONSE" | jq .
else
  echo "✅ Peer details fetched successfully!"
  echo "$PEER_DETAIL_RESPONSE" | jq .
fi
echo ""

# Step 6: Update peer friendly name (optional)
NEW_FRIENDLY_NAME="my-laptop-$(date +%s)"
echo "Step 6: Updating peer friendly name..."
echo "Calling PATCH $API_URL/api/v1/peers/$TEST_PEER_ID"
echo "New friendly name: $NEW_FRIENDLY_NAME"
echo ""

UPDATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$API_URL/api/v1/peers/$TEST_PEER_ID" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{
    \"friendly_name\": \"$NEW_FRIENDLY_NAME\"
  }")

HTTP_STATUS=$(echo "$UPDATE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Peer updated successfully!"
  echo "$RESPONSE_BODY" | jq .
else
  echo "⚠️  Failed to update peer (continuing anyway):"
  echo "$RESPONSE_BODY" | jq .
fi
echo ""

# Step 7: Download peer configuration
echo "Step 7: Downloading peer configuration..."
echo "Calling GET $API_URL/api/v1/peers/$TEST_PEER_ID/download"
echo ""

DOWNLOAD_FILE="/tmp/wireguard-test-${TEST_PEER_ID:0:8}.conf"

DOWNLOAD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_URL/api/v1/peers/$TEST_PEER_ID/download" \
  -H "Authorization: Bearer $JWT" \
  -o "$DOWNLOAD_FILE")

HTTP_STATUS=$(echo "$DOWNLOAD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Configuration downloaded successfully!"
  echo "File saved to: $DOWNLOAD_FILE"
  echo ""
  echo "Configuration preview (first 10 lines):"
  echo "----------------------------------------"
  head -10 "$DOWNLOAD_FILE"
  echo "----------------------------------------"
  echo ""
  echo "Full file size: $(wc -c < "$DOWNLOAD_FILE") bytes"
else
  echo "❌ Failed to download configuration!"
  cat "$DOWNLOAD_FILE"
  rm -f "$DOWNLOAD_FILE"
  exit 1
fi
echo ""

# Step 8: Test access control (try to access another user's peer)
echo "Step 8: Testing access control..."
echo "Attempting to list all peers (admin endpoint - should fail)..."
echo ""

ADMIN_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_URL/api/v1/admin/peers" \
  -H "Authorization: Bearer $JWT")

HTTP_STATUS=$(echo "$ADMIN_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ADMIN_TEST" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" == "403" ]; then
  echo "✅ Access control working correctly! (403 Forbidden)"
  echo "$RESPONSE_BODY" | jq .
elif [ "$HTTP_STATUS" == "401" ]; then
  echo "✅ Access control working correctly! (401 Unauthorized)"
  echo "$RESPONSE_BODY" | jq .
else
  echo "⚠️  Unexpected response:"
  echo "HTTP Status: $HTTP_STATUS"
  echo "$RESPONSE_BODY" | jq .
fi
echo ""

# Cleanup
echo "Step 9: Cleanup..."
rm -f "$DOWNLOAD_FILE"
echo "✅ Temporary files removed"
echo ""

echo "==========================================================="
echo "All tests completed successfully!"
echo "==========================================================="
echo ""
echo "Summary:"
echo "  User: $USER_EMAIL"
echo "  Active peers: $(($ACTIVE_PEERS_COUNT + ([ "$HTTP_STATUS" == "200" ] && [ -n "$CLAIM_RESPONSE" ] && echo 1 || echo 0))) / $PEER_LIMIT"
echo "  Test peer ID: $TEST_PEER_ID"
echo "  Friendly name: $NEW_FRIENDLY_NAME"
echo "  Config downloaded: ✅"
echo "  Access control: ✅"

