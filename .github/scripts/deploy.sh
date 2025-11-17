#!/bin/bash
set -e

# Find the newest deployment archive
ARCHIVE_FILE=$(ls -t /tmp/deployment-*.tar.gz 2>/dev/null | head -1)

if [ -z "$ARCHIVE_FILE" ]; then
  echo "ERROR: No deployment archive found in /tmp/"
  exit 1
fi

echo "Found archive: $ARCHIVE_FILE"

# Define deployment path
DEPLOY_PATH="/home/ubuntu/docker/wireguard-config-manager"

# Create deployment directory if it doesn't exist
mkdir -p "$DEPLOY_PATH"

# Backup current deployment (if exists)
if [ -d "$DEPLOY_PATH/backup" ]; then
  rm -rf "$DEPLOY_PATH/backup"
fi

# Backup .env to preserve it (if exists)
if [ -f "$DEPLOY_PATH/.env" ]; then
  echo "Found .env file, backing up..."
  cp "$DEPLOY_PATH/.env" "/tmp/.env.backup"
else
  echo "Warning: .env file not found"
  echo "Will proceed without .env backup"
fi

# Create backup of current files (except .env file)
if [ -f "$DEPLOY_PATH/docker-compose.yml" ]; then
  mkdir -p "$DEPLOY_PATH/backup"
  rsync -a --exclude='.env' "$DEPLOY_PATH/" "$DEPLOY_PATH/backup/" || true
fi

# Remove old files (except .env backup)
cd "$DEPLOY_PATH"
echo "Cleaning deployment directory..."
find . -mindepth 1 -maxdepth 1 ! -name 'backup' -exec rm -rf {} + 2>/dev/null || true

# Extract new files
echo "Extracting files to: $(pwd)"
echo "Using archive: $ARCHIVE_FILE"
tar -xzf "$ARCHIVE_FILE"

# Clean up archives
rm -f /tmp/deployment-*.tar.gz

# Verify extraction
echo "=== Files after extraction ==="
ls -la docker-compose.yml 2>&1 || echo "docker-compose.yml not found!"
head -5 docker-compose.yml 2>&1 || echo "Cannot read docker-compose.yml"
echo "=============================="

# Restore .env file (if it was backed up)
if [ -f "/tmp/.env.backup" ]; then
  echo "Restoring .env from backup..."
  cp "/tmp/.env.backup" "$DEPLOY_PATH/.env"
  rm "/tmp/.env.backup"
else
  echo "No .env backup found, skipping restore"
fi

# Stop and remove old containers
cd "$DEPLOY_PATH"
docker compose down || true

# Create .env file with secrets
cat > .env << EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
IMPORT_DIR=$IMPORT_DIR
NODE_ENV=production
HOST=0.0.0.0
PORT=4321
EOF

echo "✓ Created .env file from secrets"

# Build and start containers
docker compose build --no-cache
docker compose up -d

# Clean up old Docker images
docker image prune -f

# Show container status
docker compose ps

echo "✓ Deployment completed successfully!"
echo "✓ Application is running on port 4321"

