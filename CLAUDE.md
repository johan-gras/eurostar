# Eurostar Tools

## Project Overview
A suite of tools for Eurostar travelers: delay compensation automation (AutoClaim), seat intelligence (RailSeatMap), and queue prediction (EuroQueue).

## Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Node.js 20 + TypeScript 5.3 + Fastify
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn/ui
- **Queue**: BullMQ + Redis 7
- **Testing**: Vitest + Playwright
- **Deployment**: Docker + Railway/Fly.io

## Architecture Decisions

### Data Flow
```
GTFS-RT (30s) → Poller → PostgreSQL → API → Frontend
                           ↓
                    BullMQ Workers
                           ↓
                    Notifications
```

### Key Principles
1. **UTC everywhere**: All timestamps stored as UTC, converted for display
2. **Human-in-the-loop**: No automated form submissions to Eurostar
3. **Graceful degradation**: Service works even if GTFS feed is down
4. **Idempotent operations**: Polling and processing can safely retry

### Train ID Normalization
Eurostar uses different formats in UK vs EU systems:
- UK: `9Oxx` (letter O) → normalize to `90xx`
- EU: `90xx` (digit 0) → keep as-is
- Always store as 4-digit string

## Code Conventions

### File Naming
```
*.service.ts     — Business logic, pure functions preferred
*.repository.ts  — Database access (Drizzle queries)
*.handler.ts     — API route handlers
*.worker.ts      — Background job processors
*.schema.ts      — Zod schemas for validation
*.types.ts       — TypeScript type definitions
```

### Error Handling
```typescript
// Use Result type for operations that can fail
import { Result, ok, err } from '@eurostar/core/result';

// Service methods return Result
async function parseBooking(email: string): Promise<Result<Booking, ParseError>> {
  // ...
}

// Handlers convert to HTTP responses
const booking = await parseBooking(email);
if (booking.isErr()) {
  return reply.status(400).send({ error: booking.error.message });
}
```

### Validation
```typescript
// All external input validated with Zod
import { z } from 'zod';

const BookingInputSchema = z.object({
  pnr: z.string().length(6).regex(/^[A-Z0-9]+$/),
  tcn: z.string().regex(/^(IV|15)\d{9}$/),
  trainNumber: z.string().length(4).regex(/^\d{4}$/),
  journeyDate: z.coerce.date(),
});
```

## Testing Requirements

### Unit Tests
- All services must have >80% coverage
- Use `vi.mock()` for external dependencies
- Test edge cases: empty input, malformed data, network errors

### Integration Tests
- Test API routes with real database (test containers)
- Verify error responses match OpenAPI spec

### E2E Tests
- Cover critical user flows
- Use Playwright with authenticated sessions
- Mock external services (GTFS feed)

## Database Conventions

### Migrations
```bash
pnpm db:generate  # Generate migration from schema changes
pnpm db:migrate   # Apply pending migrations
pnpm db:seed      # Seed development data
```

### Naming
- Tables: `snake_case`, plural (`bookings`, `claims`)
- Columns: `snake_case` (`created_at`, `train_number`)
- Indexes: `idx_{table}_{columns}` (`idx_bookings_user_id`)

## API Conventions

### REST Endpoints
```
GET    /api/v1/bookings          # List
POST   /api/v1/bookings          # Create
GET    /api/v1/bookings/:id      # Read
PATCH  /api/v1/bookings/:id      # Update
DELETE /api/v1/bookings/:id      # Delete
```

### Response Format
```typescript
// Success
{ data: T, meta?: { page, total } }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

### Authentication
- JWT tokens in Authorization header
- Refresh tokens in HTTP-only cookies
- Rate limiting: 100 req/min per user

## Common Commands
```bash
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm db:studio        # Open Drizzle Studio
```

## Domain Skills
Load these for detailed domain knowledge:
- `.claude/skills/gtfs-parsing.md` — GTFS-RT parsing, endpoints, data structures
- `.claude/skills/eurostar-domain.md` — Compensation rules, train types, stations
- `.claude/skills/testing.md` — Test patterns and fixtures

## Reference Docs
- `docs/feasibility_synthesis.md` — Full project analysis and technical specs

## Current Focus
<!-- Update this section as you progress -->

**Phase**: 1 - AutoClaim MVP
**Current Task**: [Update with current work]
**Completed**:
- [ ] Project scaffolding
- [ ] Database schema
- [ ] GTFS-RT poller
- [ ] Email parser
- [ ] Delay monitor
- [ ] Claim generator
- [ ] API routes
- [ ] Frontend dashboard

**Blockers**: None

**Next Session**: [What to work on next]
