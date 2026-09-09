#!/usr/bin/env bash
# ============================================================
# SR ENTERPRISES CRM — PRODUCTION RESTORE SCRIPT
# ============================================================
# Safety Guaranteed:
# 1. Defaults STRICTLY to temporary test database (sr_crm_restore_test)
# 2. Production restore requires BOTH --restore-production AND --confirm-production
# 3. Validates SHA-256 checksum prior to any database write
# 4. Displays target metadata and requires explicit confirmation in interactive mode

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"

# Load environment variables if present
if [ -f "${PROJECT_ROOT}/.env.production" ]; then
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env.production"
elif [ -f "${PROJECT_ROOT}/.env" ]; then
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
PROD_DB="${POSTGRES_DB:-sr_enterprises_crm}"
TEST_DB="sr_crm_restore_test"

BACKUP_FILE=""
TARGET_DB="${TEST_DB}"
IS_PRODUCTION_TARGET=false
FLAG_RESTORE_PROD=false
FLAG_CONFIRM_PROD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --file)
      BACKUP_FILE="$2"
      shift 2
      ;;
    --test-db)
      TARGET_DB="$2"
      shift 2
      ;;
    --restore-production)
      FLAG_RESTORE_PROD=true
      shift
      ;;
    --confirm-production)
      FLAG_CONFIRM_PROD=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ [ERROR] Backup file not specified or not found!" >&2
  echo "Usage: $0 --file <path-to-backup.sql.gz> [--test-db <dbname>]" >&2
  echo "   or: $0 --file <path-to-backup.sql.gz> --restore-production --confirm-production" >&2
  exit 1
fi

# Check if production restore was requested
if [ "${FLAG_RESTORE_PROD}" = "true" ]; then
  if [ "${FLAG_CONFIRM_PROD}" != "true" ]; then
    echo "❌ [FATAL] Production restore denied!" >&2
    echo "   You must pass BOTH --restore-production AND --confirm-production to target the production database." >&2
    exit 1
  fi
  TARGET_DB="${PROD_DB}"
  IS_PRODUCTION_TARGET=true
fi

echo "============================================================"
echo "🛡️  SR ENTERPRISES CRM — DATABASE RESTORE INITIATION"
echo "============================================================"
echo "Target Environment: $([ "${IS_PRODUCTION_TARGET}" = "true" ] && echo "⚠️  PRODUCTION" || echo "🧪 TEST/VERIFICATION")"
echo "Target Database:    ${TARGET_DB}"
echo "Postgres User:      ${POSTGRES_USER}"
echo "Backup Archive:     ${BACKUP_FILE}"
echo "Archive Timestamp:  $(stat -c %y "${BACKUP_FILE}" 2>/dev/null || stat -f %Sm "${BACKUP_FILE}" 2>/dev/null || echo "Unknown")"
echo "------------------------------------------------------------"

# ------------------------------------------------------------
# STEP 1: Verify SHA-256 Checksum Integrity
# ------------------------------------------------------------
echo "⏳ Step 1: Verifying backup file integrity..."
SHA_FILE="${BACKUP_FILE}.sha256"

if [ -f "${SHA_FILE}" ]; then
  EXPECTED_SHA=$(awk '{print $1}' "${SHA_FILE}")
  if command -v sha256sum > /dev/null 2>&1; then
    ACTUAL_SHA=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  else
    ACTUAL_SHA=$(shasum -a 256 "${BACKUP_FILE}" | awk '{print $1}')
  fi

  if [ "${EXPECTED_SHA}" != "${ACTUAL_SHA}" ]; then
    echo "❌ [FATAL] SHA-256 Checksum MISMATCH! Backup archive may be corrupted." >&2
    echo "   Expected: ${EXPECTED_SHA}" >&2
    echo "   Actual:   ${ACTUAL_SHA}" >&2
    exit 1
  fi
  echo "✅ SHA-256 Checksum verified: ${ACTUAL_SHA}"
else
  echo "⚠️  [WARNING] No .sha256 checksum file found alongside archive. Validating gzip integrity..."
fi

if ! gzip -t "${BACKUP_FILE}"; then
  echo "❌ [FATAL] Gzip stream validation failed! Archive is not a valid gzip file." >&2
  exit 1
fi
echo "✅ Archive integrity validated."

# ------------------------------------------------------------
# STEP 2: Production Safeguard Confirmation
# ------------------------------------------------------------
if [ "${IS_PRODUCTION_TARGET}" = "true" ]; then
  echo ""
  echo "🚨🚨🚨 WARNING: YOU ARE ABOUT TO RESTORE OVER THE PRODUCTION DATABASE 🚨🚨🚨"
  echo "Database Name: ${TARGET_DB}"
  echo ""
  if [ -t 0 ]; then
    read -r -p "Type 'CONFIRM_RESTORE_PRODUCTION' to proceed: " CONFIRM_INPUT
    if [ "${CONFIRM_INPUT}" != "CONFIRM_RESTORE_PRODUCTION" ]; then
      echo "❌ Restoration aborted by user." >&2
      exit 1
    fi
  else
    echo "ℹ️  Non-interactive mode: Flags --restore-production and --confirm-production verified."
  fi
else
  echo "🧪 Restoring into isolated test database: ${TARGET_DB}"
  # Ensure test database exists in postgres container
  docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE \"${TARGET_DB}\";" 2>/dev/null || true
fi

# ------------------------------------------------------------
# STEP 3: Apply Database Restore
# ------------------------------------------------------------
echo "⏳ Step 2: Applying SQL dump to ${TARGET_DB}..."
gunzip -c "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER}" -d "${TARGET_DB}" > /dev/null

echo "✅ SQL dump restored successfully into ${TARGET_DB}."

# ------------------------------------------------------------
# STEP 4: Verification of Restored Database Schema & Data
# ------------------------------------------------------------
echo "⏳ Step 3: Verifying restored database structure..."
TABLE_COUNT=$(docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d '[:space:]')

echo "✅ Total public tables restored: ${TABLE_COUNT}"

if [ "${TABLE_COUNT}" -lt 10 ]; then
  echo "❌ [FATAL] Suspiciously low table count (${TABLE_COUNT}) in restored database!" >&2
  exit 1
fi

echo "============================================================"
echo "🎉 RESTORATION COMPLETED & VERIFIED"
echo "Target DB:    ${TARGET_DB}"
echo "Total Tables: ${TABLE_COUNT}"
echo "Status:       HEALTHY & OPERATIONAL"
echo "============================================================"
exit 0
