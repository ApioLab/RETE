#!/bin/sh
set -e

echo "══════════════════════════════════════════════════════════════════════"
echo " RETE - Renewable Energy Token Economy"
echo "══════════════════════════════════════════════════════════════════════"

# Wait for database to be ready
echo "[entrypoint] Waiting for database connection..."

max_retries=30
retry_count=0

until node -e "
  const pg = require('pg');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1')
    .then(() => { pool.end(); process.exit(0); })
    .catch(() => process.exit(1));
" 2>/dev/null; do
  retry_count=$((retry_count + 1))
  if [ $retry_count -ge $max_retries ]; then
    echo "[entrypoint] ERROR: Could not connect to database after $max_retries attempts"
    exit 1
  fi
  echo "[entrypoint] Database not ready, waiting... ($retry_count/$max_retries)"
  sleep 2
done

echo "[entrypoint] Database connection established"

# Run database migrations
echo "[entrypoint] Running database migrations..."
npx drizzle-kit push --force

echo "[entrypoint] Migrations completed"
echo "══════════════════════════════════════════════════════════════════════"
echo "[entrypoint] Starting application..."
echo "══════════════════════════════════════════════════════════════════════"

# Execute the main command
exec "$@"
