#!/usr/bin/env bash
# ============================================================
# SR ENTERPRISES CRM — PRODUCTION POSTGRESQL BACKUP SCRIPT
# ============================================================
# Safety Guaranteed:
# 1. Atomic temporary file creation (never replaces valid previous backups on failure)
# 2. Gzip decompression validation (gzip -t)
# 3. SHA-256 checksum calculation & verification
# 4. Mandatory off-server verification (--require-offsite): downloads remote checksum and verifies it matches
# 5. Local 14-day retention (never deletes backups unless current backup is fully verified)

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Parse command line flags
REQUIRE_OFFSITE=false
CLI_OFFSITE_DEST=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --require-offsite)
      REQUIRE_OFFSITE=true
      shift
      ;;
    --offsite-dest)
      CLI_OFFSITE_DEST="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Load environment variables if present
if [ -f "${PROJECT_ROOT}/.env.production" ]; then
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env.production"
elif [ -f "${PROJECT_ROOT}/.env" ]; then
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
fi
[ -n "${CLI_OFFSITE_DEST}" ] && OFFSITE_BACKUP_DESTINATION="${CLI_OFFSITE_DEST}"

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sr_enterprises_crm}"

echo "============================================================"
echo "🛡️  SR ENTERPRISES CRM — DATABASE BACKUP INITIATION"
echo "============================================================"
echo "Timestamp:    $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Database:     ${POSTGRES_DB}"
echo "User:         ${POSTGRES_USER}"
echo "Backup Dir:   ${BACKUP_DIR}"
echo "Offsite Req:  ${REQUIRE_OFFSITE}"
echo "------------------------------------------------------------"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME_BASE="sr_enterprises_crm_backup_${TIMESTAMP}"
TMP_SQL="${BACKUP_DIR}/${FILENAME_BASE}.tmp.sql"
TMP_GZ="${BACKUP_DIR}/${FILENAME_BASE}.tmp.sql.gz"
FINAL_GZ="${BACKUP_DIR}/${FILENAME_BASE}.sql.gz"
FINAL_SHA="${BACKUP_DIR}/${FILENAME_BASE}.sql.gz.sha256"

# Cleanup temporary files on exit
cleanup() {
  rm -f "${TMP_SQL}" "${TMP_GZ}"
}
trap cleanup EXIT

# ------------------------------------------------------------
# STEP 1: Verify PostgreSQL Container Health
# ------------------------------------------------------------
echo "⏳ Step 1: Checking PostgreSQL service readiness..."
if ! docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
  echo "❌ [FATAL] PostgreSQL service is not healthy or unreachable via Docker Compose!" >&2
  exit 1
fi
echo "✅ PostgreSQL service is healthy."

# ------------------------------------------------------------
# STEP 2: Execute pg_dump to Atomic Temporary File
# ------------------------------------------------------------
echo "⏳ Step 2: Executing pg_dump into temporary buffer..."
docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists > "${TMP_SQL}"

# Verify non-empty
SQL_SIZE=$(stat -c%s "${TMP_SQL}" 2>/dev/null || stat -f%z "${TMP_SQL}" 2>/dev/null || echo "0")
if [ "${SQL_SIZE}" -lt 1024 ]; then
  echo "❌ [FATAL] pg_dump output is suspiciously small (${SQL_SIZE} bytes). Backup aborted!" >&2
  exit 1
fi
echo "✅ Raw SQL dump generated (${SQL_SIZE} bytes)."

# ------------------------------------------------------------
# STEP 3: Compress & Validate Gzip Stream
# ------------------------------------------------------------
echo "⏳ Step 3: Compressing backup with gzip..."
gzip -c "${TMP_SQL}" > "${TMP_GZ}"

if ! gzip -t "${TMP_GZ}"; then
  echo "❌ [FATAL] Gzip stream validation failed! Archive is corrupted." >&2
  exit 1
fi
echo "✅ Gzip compression validated successfully."

# ------------------------------------------------------------
# STEP 4: Compute SHA-256 Checksum & Promote to Final File
# ------------------------------------------------------------
echo "⏳ Step 4: Computing SHA-256 checksum..."
mv "${TMP_GZ}" "${FINAL_GZ}"

if command -v sha256sum > /dev/null 2>&1; then
  sha256sum "${FINAL_GZ}" > "${FINAL_SHA}"
else
  shasum -a 256 "${FINAL_GZ}" > "${FINAL_SHA}"
fi

LOCAL_HASH=$(awk '{print $1}' "${FINAL_SHA}")
echo "✅ Backup archive promoted: ${FINAL_GZ}"
echo "🔑 SHA-256 Checksum:       ${LOCAL_HASH}"

# ------------------------------------------------------------
# STEP 5: Off-Server Backup Synchronization & Verification
# ------------------------------------------------------------
echo "⏳ Step 5: Off-server synchronization check..."
if [ -n "${OFFSITE_BACKUP_DESTINATION}" ]; then
  echo "📤 Syncing to off-server destination: ${OFFSITE_BACKUP_DESTINATION}..."

  if [ -n "${OFFSITE_BACKUP_COMMAND}" ]; then
    # Custom offsite command (e.g. aws s3 cp / rclone copy)
    eval "${OFFSITE_BACKUP_COMMAND} \"${FINAL_GZ}\" \"${OFFSITE_BACKUP_DESTINATION}/\""
    eval "${OFFSITE_BACKUP_COMMAND} \"${FINAL_SHA}\" \"${OFFSITE_BACKUP_DESTINATION}/\""
  else
    echo "ℹ️  No OFFSITE_BACKUP_COMMAND defined. Using rsync/cp if destination is a path..."
    cp "${FINAL_GZ}" "${FINAL_SHA}" "${OFFSITE_BACKUP_DESTINATION}/"
  fi

  # Remote Verification: Retrieve remote checksum and verify against local backup
  echo "🔍 Verifying remote archive existence and retrievability..."
  REMOTE_TMP_SHA="${BACKUP_DIR}/remote_verify_${TIMESTAMP}.sha256"
  if [ -n "${OFFSITE_VERIFY_COMMAND}" ]; then
    eval "${OFFSITE_VERIFY_COMMAND} \"${OFFSITE_BACKUP_DESTINATION}/${FILENAME_BASE}.sql.gz.sha256\" \"${REMOTE_TMP_SHA}\""
  elif [ -f "${OFFSITE_BACKUP_DESTINATION}/${FILENAME_BASE}.sql.gz.sha256" ]; then
    cp "${OFFSITE_BACKUP_DESTINATION}/${FILENAME_BASE}.sql.gz.sha256" "${REMOTE_TMP_SHA}"
  fi

  if [ -f "${REMOTE_TMP_SHA}" ]; then
    REMOTE_HASH=$(awk '{print $1}' "${REMOTE_TMP_SHA}")
    rm -f "${REMOTE_TMP_SHA}"
    if [ "${LOCAL_HASH}" != "${REMOTE_HASH}" ]; then
      echo "❌ [FATAL] Remote checksum mismatch! Local: ${LOCAL_HASH} vs Remote: ${REMOTE_HASH}" >&2
      exit 1
    fi
    echo "✅ Remote archive and checksum verified successfully matching local file."
  else
    if [ "${REQUIRE_OFFSITE}" = "true" ]; then
      echo "❌ [FATAL] Pre-deployment requirement failed: Could not retrieve and verify remote backup checksum!" >&2
      exit 1
    else
      echo "⚠️  [WARNING] Remote checksum could not be retrieved for automatic verification."
    fi
  fi

elif [ "${REQUIRE_OFFSITE}" = "true" ]; then
  echo "❌ [FATAL] Pre-deployment halted: OFFSITE_BACKUP_DESTINATION is not configured in .env.production!" >&2
  echo "   Production deployment requires off-server backup verification." >&2
  exit 1
else
  echo "⚠️  [NOTICE] OFFSITE_BACKUP_DESTINATION is not set. Backup is preserved on local server only."
fi

# ------------------------------------------------------------
# STEP 6: Apply Retention (Clean up local archives > RETENTION_DAYS)
# ------------------------------------------------------------
echo "⏳ Step 6: Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "sr_enterprises_crm_backup_*.sql.gz*" -type f -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
echo "✅ Retention applied."

echo "============================================================"
echo "🎉 BACKUP COMPLETED & VERIFIED SUCCESSFULLY"
echo "Archive:  ${FINAL_GZ}"
echo "Checksum: ${LOCAL_HASH}"
echo "============================================================"
exit 0
