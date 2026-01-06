#!/usr/bin/env bash
# Health check script for Eurostar Tools services
# Use for monitoring and alerting

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status symbols
CHECK="✓"
CROSS="✗"
WARN="!"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[${CHECK}]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[${WARN}]${NC} $1"; }
log_fail() { echo -e "${RED}[${CROSS}]${NC} $1"; }

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] [service...]

Check health of Eurostar Tools services.

Services:
  web         Check web frontend (Next.js)
  api         Check API server (Fastify)
  postgres    Check PostgreSQL database
  redis       Check Redis server
  all         Check all services (default)

Options:
  -e, --env FILE      Path to .env file (default: .env)
  -t, --timeout SECS  Request timeout in seconds (default: 5)
  -q, --quiet         Only output on failure
  -j, --json          Output results as JSON
  --docker            Check Docker container health
  --exit-code         Exit with non-zero if any check fails
  -h, --help          Show this help message

Environment Variables:
  WEB_URL       Web frontend URL (default: http://localhost:3000)
  API_URL       API server URL (default: http://localhost:3001)
  DATABASE_URL  PostgreSQL connection string
  REDIS_URL     Redis connection string

Examples:
  $(basename "$0")                    # Check all services
  $(basename "$0") api postgres       # Check specific services
  $(basename "$0") --json all         # JSON output for monitoring
  $(basename "$0") --docker           # Check Docker containers

EOF
    exit 0
}

# Default values
ENV_FILE=".env"
TIMEOUT=5
QUIET=false
JSON_OUTPUT=false
USE_DOCKER=false
EXIT_CODE=false
SERVICES=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        -j|--json)
            JSON_OUTPUT=true
            shift
            ;;
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --exit-code)
            EXIT_CODE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        web|api|postgres|redis|all)
            SERVICES+=("$1")
            shift
            ;;
        *)
            log_fail "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Default to all services
if [[ ${#SERVICES[@]} -eq 0 ]]; then
    SERVICES=("all")
fi

# Expand 'all' to individual services
if [[ " ${SERVICES[*]} " =~ " all " ]]; then
    SERVICES=("web" "api" "postgres" "redis")
fi

cd "$PROJECT_ROOT"

# Load environment file
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Default URLs
WEB_URL="${WEB_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:3001}"

# Results storage for JSON output
declare -A RESULTS
declare -A RESPONSE_TIMES
FAILED_COUNT=0

# Check web frontend
check_web() {
    local url="$WEB_URL"
    local start_time=$(date +%s%N)

    if curl -sf --max-time "$TIMEOUT" "$url" > /dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        RESULTS["web"]="healthy"
        RESPONSE_TIMES["web"]="$duration"
        [[ "$QUIET" == false ]] && log_success "Web frontend: healthy (${duration}ms)"
    else
        RESULTS["web"]="unhealthy"
        RESPONSE_TIMES["web"]="0"
        ((FAILED_COUNT++))
        [[ "$QUIET" == false ]] && log_fail "Web frontend: unreachable at $url"
    fi
}

# Check API server
check_api() {
    local url="$API_URL/health"
    local start_time=$(date +%s%N)

    local response
    if response=$(curl -sf --max-time "$TIMEOUT" "$url" 2>&1); then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))
        RESULTS["api"]="healthy"
        RESPONSE_TIMES["api"]="$duration"
        [[ "$QUIET" == false ]] && log_success "API server: healthy (${duration}ms)"
    else
        RESULTS["api"]="unhealthy"
        RESPONSE_TIMES["api"]="0"
        ((FAILED_COUNT++))
        [[ "$QUIET" == false ]] && log_fail "API server: unreachable at $url"
    fi
}

# Check PostgreSQL
check_postgres() {
    local start_time=$(date +%s%N)

    if [[ "$USE_DOCKER" == true ]]; then
        if docker exec eurostar-postgres pg_isready -U "${POSTGRES_USER:-eurostar}" > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            RESULTS["postgres"]="healthy"
            RESPONSE_TIMES["postgres"]="$duration"
            [[ "$QUIET" == false ]] && log_success "PostgreSQL (Docker): healthy (${duration}ms)"
        else
            RESULTS["postgres"]="unhealthy"
            RESPONSE_TIMES["postgres"]="0"
            ((FAILED_COUNT++))
            [[ "$QUIET" == false ]] && log_fail "PostgreSQL (Docker): container unhealthy"
        fi
    elif [[ -n "${DATABASE_URL:-}" ]]; then
        # Parse DATABASE_URL
        local url="${DATABASE_URL#postgresql://}"
        local db_user=$(echo "$url" | cut -d: -f1)
        local rest=$(echo "$url" | cut -d: -f2-)
        local db_pass=$(echo "$rest" | cut -d@ -f1)
        rest=$(echo "$rest" | cut -d@ -f2)
        local db_host=$(echo "$rest" | cut -d: -f1)
        rest=$(echo "$rest" | cut -d: -f2)
        local db_port=$(echo "$rest" | cut -d/ -f1)
        local db_name=$(echo "$rest" | cut -d/ -f2 | cut -d? -f1)

        if PGPASSWORD="$db_pass" pg_isready -h "$db_host" -p "$db_port" -U "$db_user" > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            RESULTS["postgres"]="healthy"
            RESPONSE_TIMES["postgres"]="$duration"
            [[ "$QUIET" == false ]] && log_success "PostgreSQL: healthy (${duration}ms)"
        else
            RESULTS["postgres"]="unhealthy"
            RESPONSE_TIMES["postgres"]="0"
            ((FAILED_COUNT++))
            [[ "$QUIET" == false ]] && log_fail "PostgreSQL: unreachable at $db_host:$db_port"
        fi
    else
        RESULTS["postgres"]="skipped"
        RESPONSE_TIMES["postgres"]="0"
        [[ "$QUIET" == false ]] && log_warn "PostgreSQL: DATABASE_URL not set, skipping"
    fi
}

# Check Redis
check_redis() {
    local start_time=$(date +%s%N)

    if [[ "$USE_DOCKER" == true ]]; then
        if docker exec eurostar-redis redis-cli ping > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            RESULTS["redis"]="healthy"
            RESPONSE_TIMES["redis"]="$duration"
            [[ "$QUIET" == false ]] && log_success "Redis (Docker): healthy (${duration}ms)"
        else
            RESULTS["redis"]="unhealthy"
            RESPONSE_TIMES["redis"]="0"
            ((FAILED_COUNT++))
            [[ "$QUIET" == false ]] && log_fail "Redis (Docker): container unhealthy"
        fi
    elif [[ -n "${REDIS_URL:-}" ]]; then
        # Parse REDIS_URL: redis://:password@host:port
        local url="${REDIS_URL#redis://}"
        local redis_pass=""
        local redis_host="localhost"
        local redis_port="6379"

        if [[ "$url" == *"@"* ]]; then
            redis_pass=$(echo "$url" | cut -d@ -f1 | cut -d: -f2)
            url=$(echo "$url" | cut -d@ -f2)
        fi
        redis_host=$(echo "$url" | cut -d: -f1)
        redis_port=$(echo "$url" | cut -d: -f2 | cut -d/ -f1)

        local redis_cmd="redis-cli -h $redis_host -p $redis_port"
        [[ -n "$redis_pass" ]] && redis_cmd="$redis_cmd -a $redis_pass"

        if $redis_cmd ping > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 ))
            RESULTS["redis"]="healthy"
            RESPONSE_TIMES["redis"]="$duration"
            [[ "$QUIET" == false ]] && log_success "Redis: healthy (${duration}ms)"
        else
            RESULTS["redis"]="unhealthy"
            RESPONSE_TIMES["redis"]="0"
            ((FAILED_COUNT++))
            [[ "$QUIET" == false ]] && log_fail "Redis: unreachable at $redis_host:$redis_port"
        fi
    else
        RESULTS["redis"]="skipped"
        RESPONSE_TIMES["redis"]="0"
        [[ "$QUIET" == false ]] && log_warn "Redis: REDIS_URL not set, skipping"
    fi
}

# Output JSON results
output_json() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local status="healthy"
    [[ $FAILED_COUNT -gt 0 ]] && status="unhealthy"

    cat << EOF
{
  "timestamp": "$timestamp",
  "status": "$status",
  "services": {
EOF

    local first=true
    for service in "${!RESULTS[@]}"; do
        [[ "$first" == false ]] && echo ","
        first=false
        cat << EOF
    "$service": {
      "status": "${RESULTS[$service]}",
      "responseTimeMs": ${RESPONSE_TIMES[$service]}
    }
EOF
    done

    cat << EOF

  }
}
EOF
}

# Main execution
[[ "$QUIET" == false && "$JSON_OUTPUT" == false ]] && log_info "Checking Eurostar Tools services..."
[[ "$QUIET" == false && "$JSON_OUTPUT" == false ]] && echo ""

for service in "${SERVICES[@]}"; do
    case "$service" in
        web)
            check_web
            ;;
        api)
            check_api
            ;;
        postgres)
            check_postgres
            ;;
        redis)
            check_redis
            ;;
    esac
done

[[ "$QUIET" == false && "$JSON_OUTPUT" == false ]] && echo ""

if [[ "$JSON_OUTPUT" == true ]]; then
    output_json
else
    if [[ $FAILED_COUNT -eq 0 ]]; then
        [[ "$QUIET" == false ]] && log_success "All services healthy"
    else
        log_fail "$FAILED_COUNT service(s) unhealthy"
    fi
fi

# Exit with error if requested and there were failures
if [[ "$EXIT_CODE" == true && $FAILED_COUNT -gt 0 ]]; then
    exit 1
fi

exit 0
