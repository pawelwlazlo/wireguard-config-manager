#!/bin/bash

# WireGuard Config Manager - Test Change Password
# Simple test script for testing password change functionality

set -e # Exit on error

API_URL="http://localhost:4321"

# Allow email/password as arguments or use defaults
USER_EMAIL="${1:-user@example.com}"
CURRENT_PASSWORD="${2:-SecureP@ss123}"
NEW_PASSWORD="${3:-NewSecure@Pass456}"

echo "========================================================"
echo "WireGuard Config Manager - Change Password Test"
echo "========================================================"
echo ""
echo "Testing password change for user: $USER_EMAIL"
echo ""

# Step 1: Login to get JWT
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$CURRENT_PASSWORD\"
  }")

# Extract status code and body
HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ Login failed with status $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

JWT=$(echo "$RESPONSE_BODY" | jq -r '.jwt')

if [ -z "$JWT" ] || [ "$JWT" == "null" ]; then
  echo "❌ No JWT token in response"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo "✓ Login successful"
echo ""

# Step 2: Change password
echo "Step 2: Changing password..."
CHANGE_PASSWORD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/users/me/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d "{
    \"current_password\": \"$CURRENT_PASSWORD\",
    \"new_password\": \"$NEW_PASSWORD\"
  }")

# Extract status code and body
HTTP_STATUS=$(echo "$CHANGE_PASSWORD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CHANGE_PASSWORD_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ Password change failed with status $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

NEW_JWT=$(echo "$RESPONSE_BODY" | jq -r '.jwt')

if [ -z "$NEW_JWT" ] || [ "$NEW_JWT" == "null" ]; then
  echo "❌ No new JWT token in response"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo "✓ Password changed successfully"
echo "✓ New JWT token received"
echo ""

# Step 3: Test login with old password (should fail)
echo "Step 3: Testing login with old password (should fail)..."
OLD_PASSWORD_LOGIN=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$CURRENT_PASSWORD\"
  }")

HTTP_STATUS=$(echo "$OLD_PASSWORD_LOGIN" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "❌ Login with old password succeeded (should have failed)"
  exit 1
fi

echo "✓ Login with old password correctly rejected"
echo ""

# Step 4: Test login with new password (should succeed)
echo "Step 4: Testing login with new password (should succeed)..."
NEW_PASSWORD_LOGIN=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$NEW_PASSWORD\"
  }")

HTTP_STATUS=$(echo "$NEW_PASSWORD_LOGIN" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$NEW_PASSWORD_LOGIN" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ Login with new password failed with status $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo "✓ Login with new password successful"
echo ""

# Step 5: Verify JWT works with /me endpoint
echo "Step 5: Verifying new JWT with /me endpoint..."
FINAL_JWT=$(echo "$RESPONSE_BODY" | jq -r '.jwt')
ME_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$API_URL/api/v1/users/me" \
  -H "Authorization: Bearer $FINAL_JWT")

HTTP_STATUS=$(echo "$ME_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$ME_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "❌ Failed to fetch user profile with status $HTTP_STATUS"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

USER_INFO=$(echo "$RESPONSE_BODY" | jq -r '.email')

if [ "$USER_INFO" != "$USER_EMAIL" ]; then
  echo "❌ User email mismatch"
  exit 1
fi

echo "✓ User profile retrieved successfully"
echo ""

echo "========================================================"
echo "✅ All password change tests passed!"
echo "========================================================"
echo ""
echo "Summary:"
echo "  • Current password verified"
echo "  • Password changed successfully"
echo "  • Old password no longer works"
echo "  • New password works correctly"
echo "  • New JWT token is valid"
echo ""

# Note: To change back, run:
# ./test-change-password.sh "$USER_EMAIL" "$NEW_PASSWORD" "$CURRENT_PASSWORD"

