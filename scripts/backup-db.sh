#!/usr/bin/env bash
# Database backup script for Eurostar Tools
# Supports local PostgreSQL, Docker containers, and remote databases

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] <action>

Backup and restore PostgreSQL database for Eurostar Tools.

Actions:
  backup      Create a new database backup
  restore     Restore from a backup file
  list        List available backups
  clean       Remove old backups (keeps last N)

Options:
  -e, --env FILE        Path to .env file (default: .env)
  -d, --dir DIR         Backup directory (default: ./backups)
  -f, --file FILE       Backup file for restore (required for restore)
  -k, --keep N          Number of backups to keep for clean (default: 7)
  -c, --container NAME  Docker container name (default: eurostar-postgres)
  --docker              Use Docker container for pg_dump/pg_restore
  --compress            Use gzip compression (default: true)
  --no-compress         Disable compression
  -h, --help            Show this help message

Examples:
  $(basename "$0") backup                     # Create backup
  $(basename "$0") backup --docker            # Backup from Docker container
  $(basename "$0") restore -f backup.sql.gz   # Restore from file
  $(basename "$0") list                       # List available backups
  $(basename "$0") clean -k 5                 # Keep only last 5 backups

EOF
    exit 0
}

# Default values
ENV_FILE=".env"
BACKUP_DIR="$PROJECT_ROOT/backups"
BACKUP_FILE=""
KEEP_BACKUPS=7
USE_DOCKER=false
COMPRESS=true
CONTAINER_NAME="eurostar-postgres"
ACTION=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -k|--keep)
            KEEP_BACKUPS="$2"
            shift 2
            ;;
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --compress)
            COMPRESS=true
            shift
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        -h|--help)
            usage
            ;;
        backup|restore|list|clean)
            ACTION="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            ;;
    esac
done

if [[ -z "$ACTION" ]]; then
    log_error "Action is required. Use 'backup', 'restore', 'list', or 'clean'."
fi

cd "$PROJECT_ROOT"

# Load environment file
if [[ -f "$ENV_FILE" ]]; then
    log_info "Loading environment from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
fi

# Parse DATABASE_URL or use individual variables
parse_db_url() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        # Parse postgresql://user:password@host:port/database
        local url="${DATABASE_URL#postgresql://}"
        DB_USER=$(echo "$url" | cut -d: -f1)
        local rest=$(echo "$url" | cut -d: -f2-)
        DB_PASSWORD=$(echo "$rest" | cut -d@ -f1)
        rest=$(echo "$rest" | cut -d@ -f2)
        DB_HOST=$(echo "$rest" | cut -d: -f1)
        rest=$(echo "$rest" | cut -d: -f2)
        DB_PORT=$(echo "$rest" | cut -d/ -f1)
        DB_NAME=$(echo "$rest" | cut -d/ -f2 | cut -d? -f1)
    else
        DB_USER="${POSTGRES_USER:-eurostar}"
        DB_PASSWORD="${POSTGRES_PASSWORD:-}"
        DB_HOST="${POSTGRES_HOST:-localhost}"
        DB_PORT="${POSTGRES_PORT:-5432}"
        DB_NAME="${POSTGRES_DB:-eurostar}"
    fi
}

# Create backup
do_backup() {
    mkdir -p "$BACKUP_DIR"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="eurostar_${timestamp}"
    local backup_path="$BACKUP_DIR/${backup_name}.sql"

    parse_db_url

    log_info "Starting database backup..."
    log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"

    if [[ "$USE_DOCKER" == true ]]; then
        log_info "Using Docker container: $CONTAINER_NAME"
        docker exec "$CONTAINER_NAME" pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --clean \
            --if-exists \
            --no-owner \
            --no-acl \
            > "$backup_path"
    else
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --clean \
            --if-exists \
            --no-owner \
            --no-acl \
            > "$backup_path"
    fi

    if [[ "$COMPRESS" == true ]]; then
        log_info "Compressing backup..."
        gzip "$backup_path"
        backup_path="${backup_path}.gz"
    fi

    local size=$(du -h "$backup_path" | cut -f1)
    log_success "Backup created: $backup_path ($size)"
}

# Restore backup
do_restore() {
    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "Backup file is required for restore. Use -f or --file."
    fi

    if [[ ! -f "$BACKUP_FILE" ]]; then
        # Try relative to backup dir
        if [[ -f "$BACKUP_DIR/$BACKUP_FILE" ]]; then
            BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
        else
            log_error "Backup file not found: $BACKUP_FILE"
        fi
    fi

    parse_db_url

    log_warn "This will overwrite the database: $DB_NAME @ $DB_HOST:$DB_PORT"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled."
        exit 0
    fi

    log_info "Restoring from: $BACKUP_FILE"

    local cat_cmd="cat"
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        cat_cmd="gunzip -c"
    fi

    if [[ "$USE_DOCKER" == true ]]; then
        log_info "Using Docker container: $CONTAINER_NAME"
        $cat_cmd "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql \
            -U "$DB_USER" \
            -d "$DB_NAME"
    else
        $cat_cmd "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME"
    fi

    log_success "Database restored from $BACKUP_FILE"
}

# List backups
do_list() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warn "Backup directory does not exist: $BACKUP_DIR"
        exit 0
    fi

    log_info "Available backups in $BACKUP_DIR:"
    echo ""

    local count=0
    while IFS= read -r file; do
        if [[ -n "$file" ]]; then
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)
            echo "  $(basename "$file")  ($size)  $date"
            ((count++))
        fi
    done < <(find "$BACKUP_DIR" -name "eurostar_*.sql*" -type f | sort -r)

    echo ""
    log_info "Total: $count backup(s)"
}

# Clean old backups
do_clean() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warn "Backup directory does not exist: $BACKUP_DIR"
        exit 0
    fi

    local files=($(find "$BACKUP_DIR" -name "eurostar_*.sql*" -type f | sort -r))
    local total=${#files[@]}

    if [[ $total -le $KEEP_BACKUPS ]]; then
        log_info "Found $total backup(s), keeping $KEEP_BACKUPS. Nothing to clean."
        exit 0
    fi

    local to_delete=$((total - KEEP_BACKUPS))
    log_info "Found $total backups, keeping $KEEP_BACKUPS, removing $to_delete"

    for ((i=$KEEP_BACKUPS; i<total; i++)); do
        local file="${files[$i]}"
        log_info "Removing: $(basename "$file")"
        rm "$file"
    done

    log_success "Cleaned up $to_delete old backup(s)"
}

# Main execution
case "$ACTION" in
    backup)
        do_backup
        ;;
    restore)
        do_restore
        ;;
    list)
        do_list
        ;;
    clean)
        do_clean
        ;;
esac
