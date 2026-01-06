#!/usr/bin/env bash
# Deployment automation script for Eurostar Tools
# Supports: fly.io, Railway, and Docker Compose deployments

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
Usage: $(basename "$0") [OPTIONS] <platform> [service]

Deploy Eurostar Tools to the specified platform.

Platforms:
  fly         Deploy to Fly.io
  railway     Deploy to Railway
  docker      Deploy using Docker Compose (production)

Services (for fly):
  web         Deploy web app only (default)
  api         Deploy API only
  worker      Deploy worker only
  all         Deploy all services

Options:
  -e, --env FILE    Path to .env file (default: .env.production)
  -n, --no-migrate  Skip database migrations
  -b, --no-build    Skip building before deploy
  -d, --dry-run     Show what would be deployed without deploying
  -h, --help        Show this help message

Examples:
  $(basename "$0") fly all           # Deploy all services to Fly.io
  $(basename "$0") fly api           # Deploy only API to Fly.io
  $(basename "$0") railway           # Deploy to Railway
  $(basename "$0") docker            # Deploy with Docker Compose

EOF
    exit 0
}

# Default values
ENV_FILE=".env.production"
SKIP_MIGRATE=false
SKIP_BUILD=false
DRY_RUN=false
PLATFORM=""
SERVICE="all"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -n|--no-migrate)
            SKIP_MIGRATE=true
            shift
            ;;
        -b|--no-build)
            SKIP_BUILD=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        fly|railway|docker)
            PLATFORM="$1"
            shift
            ;;
        web|api|worker|all)
            SERVICE="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            ;;
    esac
done

if [[ -z "$PLATFORM" ]]; then
    log_error "Platform is required. Use 'fly', 'railway', or 'docker'."
fi

cd "$PROJECT_ROOT"

# Load environment file if exists
if [[ -f "$ENV_FILE" ]]; then
    log_info "Loading environment from $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
fi

# Check required tools
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
    fi
}

# Run build
run_build() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warn "Skipping build (--no-build flag)"
        return
    fi
    log_info "Building project..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: pnpm build"
    else
        pnpm build
        log_success "Build completed"
    fi
}

# Run migrations
run_migrations() {
    if [[ "$SKIP_MIGRATE" == true ]]; then
        log_warn "Skipping migrations (--no-migrate flag)"
        return
    fi
    log_info "Running database migrations..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: pnpm db:migrate:prod"
    else
        pnpm db:migrate:prod
        log_success "Migrations completed"
    fi
}

# Deploy to Fly.io
deploy_fly() {
    check_tool "flyctl"

    local services=()
    case "$SERVICE" in
        all)
            services=("web" "api" "worker")
            ;;
        *)
            services=("$SERVICE")
            ;;
    esac

    run_build
    run_migrations

    for svc in "${services[@]}"; do
        local config_file
        case "$svc" in
            web)
                config_file="fly.toml"
                ;;
            api)
                config_file="fly.api.toml"
                ;;
            worker)
                config_file="fly.worker.toml"
                ;;
        esac

        log_info "Deploying $svc to Fly.io..."
        if [[ "$DRY_RUN" == true ]]; then
            log_info "[DRY RUN] Would run: flyctl deploy --config $config_file"
        else
            flyctl deploy --config "$config_file"
            log_success "$svc deployed to Fly.io"
        fi
    done
}

# Deploy to Railway
deploy_railway() {
    check_tool "railway"

    run_build
    run_migrations

    log_info "Deploying to Railway..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: railway up"
    else
        railway up
        log_success "Deployed to Railway"
    fi
}

# Deploy with Docker Compose
deploy_docker() {
    check_tool "docker"

    run_build

    log_info "Building Docker images..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: docker compose -f docker-compose.prod.yml build"
    else
        docker compose -f docker-compose.prod.yml build
    fi

    log_info "Starting services..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: docker compose -f docker-compose.prod.yml up -d"
    else
        docker compose -f docker-compose.prod.yml up -d
    fi

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 5

    run_migrations

    log_success "Docker deployment completed"

    # Show running containers
    docker compose -f docker-compose.prod.yml ps
}

# Main execution
case "$PLATFORM" in
    fly)
        deploy_fly
        ;;
    railway)
        deploy_railway
        ;;
    docker)
        deploy_docker
        ;;
esac

log_success "Deployment to $PLATFORM completed!"
