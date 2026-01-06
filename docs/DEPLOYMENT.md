# Deployment Guide

This guide covers deploying Eurostar Tools to Railway and Fly.io.

## Prerequisites

- Docker installed locally
- Node.js 20+ and pnpm 9+
- Railway CLI (`npm i -g @railway/cli`) or Fly CLI (`brew install flyctl`)
- PostgreSQL 16 database
- Redis 7 instance

## Environment Variables

All services require these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `JWT_EXPIRES_IN` | JWT expiration (default: 7d) | No |
| `GTFS_RT_API_KEY` | GTFS-RT feed API key | No |
| `RESEND_API_KEY` | Resend email API key | No |

### Web-specific
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | API URL for frontend | Yes |

---

## Railway Deployment

Railway supports monorepo deployments with multiple services.

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 2. Create Project

```bash
railway init
```

### 3. Add Services

Create PostgreSQL and Redis:
```bash
railway add --plugin postgresql
railway add --plugin redis
```

### 4. Deploy Services

Deploy the web app:
```bash
railway up --service web
```

Deploy the API:
```bash
railway up --service api
```

Deploy the worker:
```bash
railway up --service worker
```

### 5. Configure Environment Variables

Via Railway dashboard or CLI:
```bash
railway variables set JWT_SECRET=your-secret-here
railway variables set GTFS_RT_API_KEY=your-key
railway variables set RESEND_API_KEY=your-key
```

Railway automatically injects `DATABASE_URL` and `REDIS_URL` for linked plugins.

### 6. Custom Domain

```bash
railway domain
```

---

## Fly.io Deployment

Fly.io requires separate apps for each service.

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Or via script
curl -L https://fly.io/install.sh | sh

flyctl auth login
```

### 2. Create Apps

```bash
# Web app
fly apps create eurostar-web

# API
fly apps create eurostar-api

# Worker
fly apps create eurostar-worker
```

### 3. Create PostgreSQL Database

```bash
fly postgres create --name eurostar-db --region lhr
fly postgres attach eurostar-db --app eurostar-api
fly postgres attach eurostar-db --app eurostar-worker
```

### 4. Create Redis (Upstash)

```bash
fly redis create --name eurostar-redis --region lhr
```

Or use Fly.io's Redis addon and set `REDIS_URL` manually.

### 5. Set Secrets

```bash
# API secrets
fly secrets set JWT_SECRET=your-secret-here --app eurostar-api
fly secrets set GTFS_RT_API_KEY=your-key --app eurostar-api
fly secrets set RESEND_API_KEY=your-key --app eurostar-api

# Worker secrets
fly secrets set GTFS_RT_API_KEY=your-key --app eurostar-worker
fly secrets set RESEND_API_KEY=your-key --app eurostar-worker

# Web secrets
fly secrets set NEXT_PUBLIC_API_URL=https://eurostar-api.fly.dev --app eurostar-web
```

### 6. Deploy

```bash
# Deploy web
fly deploy --config fly.toml

# Deploy API
fly deploy --config fly.api.toml

# Deploy worker
fly deploy --config fly.worker.toml
```

### 7. Scale (Optional)

```bash
fly scale count 2 --app eurostar-api
fly scale memory 1024 --app eurostar-api
```

### 8. Custom Domain

```bash
fly certs create your-domain.com --app eurostar-web
```

---

## Database Migrations

Run migrations after deployment:

### Railway
```bash
railway run pnpm db:migrate
```

### Fly.io
```bash
fly ssh console --app eurostar-api -C "pnpm db:migrate"
```

Or run locally with production DATABASE_URL:
```bash
DATABASE_URL=your-prod-url pnpm db:migrate
```

---

## Health Checks

- **Web**: `GET /` (200 OK)
- **API**: `GET /health` (200 OK with JSON status)

---

## Monitoring

### Railway
- Built-in metrics in Railway dashboard
- Logs: `railway logs`

### Fly.io
- Metrics: `fly dashboard`
- Logs: `fly logs --app eurostar-api`
- SSH: `fly ssh console --app eurostar-api`

---

## Rollback

### Railway
```bash
railway rollback
```

### Fly.io
```bash
fly releases --app eurostar-api
fly deploy --image registry.fly.io/eurostar-api:v123
```

---

## Troubleshooting

### Build Fails
- Ensure `pnpm-lock.yaml` is committed
- Check Node.js version matches `engines` in package.json
- Verify Dockerfile paths are correct

### Connection Issues
- Check environment variables are set
- Verify PostgreSQL/Redis are accessible from app region
- Check security groups/firewall rules

### Memory Issues
- Increase VM memory in fly.toml or Railway settings
- Enable Node.js memory limits: `NODE_OPTIONS=--max-old-space-size=384`
