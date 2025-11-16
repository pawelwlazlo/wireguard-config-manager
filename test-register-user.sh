#!/bin/bash

# WireGuard Config Manager - Test User Registration
# Simple test script for registering a regular user

set -e # Exit on error

API_URL="http://localhost:4321"

# Allow email/password as arguments or use defaults
USER_EMAIL="${1:-user@example.com}"
USER_PASSWORD="${2:-SecureP@ss123}"

echo "========================================================"
echo "WireGuard Config Manager - User Registration Test"
echo "========================================================"
echo ""
echo "Registering user: $USER_EMAIL"
echo ""

# Register user
REGISTER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

# Extract status code and body
HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "201" ]; then
  echo "✅ User registered successfully!"
  echo "$RESPONSE_BODY" | jq .
  
  USER_ID=$(echo "$RESPONSE_BODY" | jq -r '.user.id')
  USER_ROLES=$(echo "$RESPONSE_BODY" | jq -r '.user.roles | join(", ")')
  PEER_LIMIT=$(echo "$RESPONSE_BODY" | jq -r '.user.peer_limit')
  
  echo ""
  echo "Summary:"
  echo "  Email: $USER_EMAIL"
  echo "  User ID: $USER_ID"
  echo "  Roles: $USER_ROLES"
  echo "  Peer limit: $PEER_LIMIT"
  echo ""
  
  # Check if user has expected role
  if [[ "$USER_ROLES" == *"user"* ]] && [[ "$USER_ROLES" != *"admin"* ]]; then
    echo "✅ User has correct role (user)"
  elif [[ "$USER_ROLES" == *"admin"* ]]; then
    echo "⚠️  Warning: User has admin role (first user gets admin automatically)"
  else
    echo "⚠️  Warning: Unexpected roles: $USER_ROLES"
  fi
  
elif [ "$HTTP_STATUS" == "409" ]; then
  echo "⚠️  User already exists (409 Conflict)"
  echo "$RESPONSE_BODY" | jq .
  echo ""
  echo "This is OK if you've already registered this user."
  echo "Use a different email or reset the database."
  
elif [ "$HTTP_STATUS" == "400" ]; then
  echo "❌ Registration failed (400 Bad Request)"
  echo "$RESPONSE_BODY" | jq .
  echo ""
  
  ERROR=$(echo "$RESPONSE_BODY" | jq -r '.error')
  
  if [ "$ERROR" == "InvalidDomain" ]; then
    DOMAIN=$(echo "$USER_EMAIL" | cut -d@ -f2)
    echo "Tip: Domain '$DOMAIN' is not in accepted_domains table"
    echo "Add it with:"
    echo "  PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \\"
    echo "    -c \"INSERT INTO app.accepted_domains (domain) VALUES ('$DOMAIN');\""
  elif [ "$ERROR" == "ValidationError" ]; then
    echo "Tip: Check email format and password requirements"
  fi
  
  exit 1
else
  echo "❌ Registration failed!"
  echo "$RESPONSE_BODY" | jq .
  exit 1
fi

echo ""
echo "========================================================"
echo "Test completed!"
echo "========================================================"

