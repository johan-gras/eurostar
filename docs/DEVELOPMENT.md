# Development Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/products/docker-desktop/))

Verify your installation:

```bash
node --version    # Should be v20.x.x or higher
pnpm --version    # Should be 9.x.x or higher
docker --version  # Should be 20.x.x or higher
```

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd eurostar-tools
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure the required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 characters)
- `RESEND_API_KEY` - API key for email notifications

### 3. Start Infrastructure Services

```bash
docker compose up -d
```

This starts PostgreSQL and Redis containers.

### 4. Set Up the Database

```bash
pnpm db:migrate   # Apply migrations
pnpm db:seed      # Seed development data (optional)
```

### 5. Start Development Servers

```bash
pnpm dev
```

This starts all services in watch mode:
- Web app: http://localhost:3000
- API server: http://localhost:3001

## Project Structure

```
eurostar-tools/
├── apps/
│   └── web/              # Next.js 14 frontend (App Router)
├── packages/
│   ├── core/             # Shared utilities, DB, auth, queue
│   ├── autoclaim/        # Delay compensation automation
│   ├── seatmap/          # Seat intelligence (RailSeatMap)
│   └── euroqueue/        # Queue prediction (EuroQueue)
├── docs/                 # Documentation
├── e2e/                  # End-to-end tests (Playwright)
├── scripts/              # Utility scripts
├── turbo.json            # Turborepo configuration
└── docker-compose.yml    # Development infrastructure
```

### Package Dependencies

```
@eurostar/web
├── @eurostar/core
└── @eurostar/autoclaim

@eurostar/autoclaim
└── @eurostar/core

@eurostar/seatmap
└── @eurostar/core

@eurostar/euroqueue
└── @eurostar/core
```

## Running Tests

### Unit Tests

```bash
pnpm test             # Run all unit tests once
pnpm test:watch       # Run tests in watch mode
```

### End-to-End Tests

```bash
pnpm test:e2e         # Run Playwright tests headless
pnpm test:e2e:ui      # Run with Playwright UI
pnpm test:e2e:headed  # Run in headed browser mode
```

### Run All Tests

```bash
pnpm test:all         # Unit tests + E2E tests
```

## Code Style Guide

### File Naming Conventions

| Suffix | Purpose |
|--------|---------|
| `*.service.ts` | Business logic, pure functions preferred |
| `*.repository.ts` | Database access (Drizzle queries) |
| `*.handler.ts` | API route handlers |
| `*.worker.ts` | Background job processors |
| `*.schema.ts` | Zod validation schemas |
| `*.types.ts` | TypeScript type definitions |

### Error Handling

Use the `Result` type for operations that can fail:

```typescript
import { Result, ok, err } from '@eurostar/core/result';

async function parseBooking(email: string): Promise<Result<Booking, ParseError>> {
  try {
    const booking = /* parse logic */;
    return ok(booking);
  } catch (e) {
    return err(new ParseError('Failed to parse booking'));
  }
}
```

### Validation

All external input must be validated with Zod:

```typescript
import { z } from 'zod';

const BookingInputSchema = z.object({
  pnr: z.string().length(6).regex(/^[A-Z0-9]+$/),
  tcn: z.string().regex(/^(IV|15)\d{9}$/),
  trainNumber: z.string().length(4).regex(/^\d{4}$/),
  journeyDate: z.coerce.date(),
});
```

### Train ID Normalization

Eurostar uses different formats in UK vs EU systems:
- UK: `9Oxx` (letter O) → normalize to `90xx`
- EU: `90xx` (digit 0) → keep as-is
- Always store as 4-digit string

### API Response Format

```typescript
// Success
{ data: T, meta?: { page, total } }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in dev mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint all packages |
| `pnpm lint:fix` | Lint and auto-fix issues |
| `pnpm typecheck` | Type check all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm clean` | Clean build artifacts |

### Database Commands

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed development data |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Database Connection Issues

1. Ensure Docker containers are running: `docker compose ps`
2. Check DATABASE_URL in `.env` matches docker-compose.yml settings
3. Try restarting containers: `docker compose down && docker compose up -d`

### pnpm Install Fails

```bash
pnpm store prune    # Clean pnpm cache
rm -rf node_modules # Remove all node_modules
pnpm install        # Reinstall dependencies
```

### Build Errors

```bash
pnpm clean          # Clean all build artifacts
pnpm build          # Rebuild everything
```
