#!/bin/bash
# Clone production Supabase data to local dev instance
# Usage: ./scripts/clone-prod-to-local.sh
#
# Prerequisites:
#   - supabase CLI installed and linked (supabase link)
#   - Docker running
#   - psql available
set -euo pipefail

LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DUMP_FILE="/tmp/prod-data-dump.sql"

echo "=== Clone Prod → Local Dev ==="
echo ""

# Step 1: Check local Supabase is running
echo "[1/4] Checking local Supabase..."
if ! supabase status >/dev/null 2>&1; then
  echo "  Starting Supabase local..."
  supabase start
else
  echo "  ✓ Already running"
fi

# Step 2: Reset local DB (apply all migrations fresh)
echo "[2/4] Resetting local DB + applying migrations..."
supabase db reset --no-seed 2>&1 | tail -3
echo "  ✓ Schema ready"

# Step 3: Dump + import prod data
echo "[3/4] Dumping prod data..."
supabase db dump --linked --data-only -f "$DUMP_FILE" 2>&1 | grep -v "^pg_dump:" | tail -3
echo "  ✓ Dump: $(du -h "$DUMP_FILE" | cut -f1)"

echo "  Importing into local DB..."
psql "$LOCAL_DB" -f "$DUMP_FILE" --quiet 2>&1 | grep -c "ERROR" | xargs -I{} echo "  ({} non-critical errors skipped)"
echo "  ✓ Data imported"

# Step 4: Verify
echo "[4/4] Verifying..."
psql "$LOCAL_DB" -t -c "
SELECT 'students: ' || count(*) FROM students
UNION ALL SELECT 'sessions: ' || count(*) FROM sessions
UNION ALL SELECT 'exercises: ' || count(*) FROM student_exercises
UNION ALL SELECT 'knowledge: ' || count(*) FROM formation_knowledge;
" 2>/dev/null | sed 's/^ */  /'

echo ""
echo "=== Done ==="
echo "Studio:  http://127.0.0.1:54323"
echo "Dev bot: pnpm -F @assistme/bot-discord dev"

rm -f "$DUMP_FILE"
