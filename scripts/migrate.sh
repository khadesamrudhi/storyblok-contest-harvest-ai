#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/migrate.sh
# Or provide PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
MIG_DIR="$ROOT_DIR/database/migrations"
POL_DIR="$ROOT_DIR/database/policies"
SEED_DIR="$ROOT_DIR/database/seeds"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -z "${PGHOST:-}" || -z "${PGUSER:-}" || -z "${PGDATABASE:-}" ]]; then
    echo "ERROR: Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE (and optionally PGPASSWORD/PGPORT)"
    exit 1
  fi
fi

PSQL=(psql)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL+=("$DATABASE_URL")
fi

echo "Applying migrations from: $MIG_DIR"

# Detect consolidated migration inside 001
CONSOLIDATED=false
if grep -q "-- database/migrations/002_create_competitors.sql" "$MIG_DIR/001_create_users.sql"; then
  CONSOLIDATED=true
  echo "Detected consolidated schema in 001_create_users.sql; will only apply 001 to avoid duplicates."
fi

apply_file() {
  local file="$1"
  if [[ ! -s "$file" ]]; then
    echo "Skipping empty: $(basename "$file")"
    return
  fi
  echo "Applying: $(basename "$file")"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    PGPASSWORD="${PGPASSWORD:-}" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  else
    PGPASSWORD="${PGPASSWORD:-}" psql -h "${PGHOST}" -p "${PGPORT:-5432}" -U "${PGUSER}" -d "${PGDATABASE}" -v ON_ERROR_STOP=1 -f "$file"
  fi
}

if [[ "$CONSOLIDATED" == true ]]; then
  apply_file "$MIG_DIR/001_create_users.sql"
else
  # Apply all *.sql in lexical order (001, 002, ...)
  for sql in $(ls "$MIG_DIR"/*.sql | sort); do
    apply_file "$sql"
  done
fi

# Apply policies (if any)
if [[ -d "$POL_DIR" ]]; then
  echo "Applying policies from: $POL_DIR"
  for sql in $(ls "$POL_DIR"/*.sql 2>/dev/null | sort); do
    apply_file "$sql"
  done
fi

# Apply seeds (optional)
if [[ -d "$SEED_DIR" ]]; then
  echo "Applying seeds from: $SEED_DIR"
  for sql in $(ls "$SEED_DIR"/*.sql 2>/dev/null | sort); do
    apply_file "$sql"
  done
fi

echo "Migrations applied successfully."

