#!/bin/bash

# WireGuard Config Manager - Test Admin Import
# This script tests the complete flow: login as admin -> import peers

set -e # Exit on error

API_URL="http://localhost:4321"
ADMIN_EMAIL="admin@example.com"
# Note: Change password if you used different one during registration
ADMIN_PASSWORD="SecureP@ss123"

echo "================================================"
echo "WireGuard Config Manager - Admin Import Test"
echo "================================================"
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

# Step 2: Import peers
echo "Step 2: Importing WireGuard peers..."
echo "Calling POST $API_URL/api/v1/admin/import"
echo ""

IMPORT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/admin/import" \
  -H "Authorization: Bearer $JWT")

# Extract status code and body
HTTP_STATUS=$(echo "$IMPORT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$IMPORT_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Import successful!"
  echo "$RESPONSE_BODY" | jq .
  
  FILES_IMPORTED=$(echo "$RESPONSE_BODY" | jq -r .files_imported)
  BATCH_ID=$(echo "$RESPONSE_BODY" | jq -r .batch_id)
  
  echo ""
  echo "Summary:"
  echo "  Files imported: $FILES_IMPORTED"
  echo "  Batch ID: $BATCH_ID"
else
  echo "❌ Import failed!"
  echo "$RESPONSE_BODY" | jq .
  
  # Show helpful error messages
  if echo "$RESPONSE_BODY" | grep -q "Unauthorized"; then
    echo ""
    echo "Tip: JWT token might be invalid or expired"
  elif echo "$RESPONSE_BODY" | grep -q "Forbidden"; then
    echo ""
    echo "Tip: User doesn't have admin permissions"
  elif echo "$RESPONSE_BODY" | grep -q "IMPORT_DIR"; then
    echo ""
    echo "Tip: Make sure IMPORT_DIR is set in .env file"
  elif echo "$RESPONSE_BODY" | grep -q "ENCRYPTION_KEY"; then
    echo ""
    echo "Tip: Make sure ENCRYPTION_KEY is set in .env file"
  fi
  
  exit 1
fi

echo ""
echo "================================================"
echo "Test completed successfully!"
echo "================================================"

