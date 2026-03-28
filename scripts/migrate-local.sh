#!/bin/bash
# Apply pending SQL migrations to local Supabase
# Only runs when SUPABASE_URL points to localhost (dev environment)

set -e

# Load .env.dev if it exists
if [ -f .env.dev ]; then
  export $(grep -v '^#' .env.dev | grep -v '^\s*$' | xargs)
fi

# Safety: only run on local Supabase
if [[ "$SUPABASE_URL" != *"127.0.0.1"* && "$SUPABASE_URL" != *"localhost"* ]]; then
  echo "⚠ Skipping auto-migrate: SUPABASE_URL is not local"
  exit 0
fi

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Check if postgres is reachable
if ! psql "$DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "⚠ Local Supabase not running — skipping migrations"
  exit 0
fi

# Create migration tracking table if not exists
psql "$DB_URL" -q -c "
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  );
"

# Apply each migration file in order
MIGRATIONS_DIR="supabase/migrations"
APPLIED=0

for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  name=$(basename "$file")

  # Check if already applied
  already=$(psql "$DB_URL" -tAc "SELECT 1 FROM _migrations WHERE name='$name'" 2>/dev/null)

  if [ "$already" != "1" ]; then
    echo "Applying $name..."
    psql "$DB_URL" -q -f "$file"
    psql "$DB_URL" -q -c "INSERT INTO _migrations (name) VALUES ('$name')"
    APPLIED=$((APPLIED + 1))
  fi
done

if [ "$APPLIED" -gt 0 ]; then
  echo "✓ $APPLIED migration(s) applied"
else
  echo "✓ All migrations up to date"
fi
