# Session Scratchpad

Use this file to maintain context between Claude Code sessions.

---

## Last Session Summary

**Date**: January 6, 2026
**Duration**: Meta-orchestration session (automated via CLI)

### Completed - All 3 Phases!

#### Phase 1: AutoClaim MVP
- [x] Turborepo monorepo setup (core, autoclaim, web)
- [x] Database schema (users, trains, bookings, claims)
- [x] Drizzle ORM + migrations working
- [x] GTFS-RT poller (fetching 453 trains every 30s)
- [x] BullMQ worker infrastructure
- [x] Email parser (28 tests)
- [x] Delay monitor (27 tests)
- [x] Eligibility calculator (47 tests)
- [x] Claim generator (35 tests)
- [x] Notification service (25 tests)
- [x] REST API (17 tests)
- [x] Frontend dashboard

#### Phase 2: RailSeatMap
- [x] Package scaffolding (@eurostar/seatmap)
- [x] Type definitions (TrainType, SeatFeature, SeatWarning, SeatInfo)
- [x] E320 seat data (892 seats, 16 coaches, features/warnings)
- [x] Seat recommendation algorithm with scoring
- [x] API endpoints (4 routes)
- [x] Frontend seat map visualization
- [x] Tests (82 passing)

#### Phase 3: EuroQueue
- [x] Package scaffolding (@eurostar/euroqueue)
- [x] Type definitions (Terminal, QueuePrediction, CrowdLevel)
- [x] Historical baseline data (672 entries: 4 terminals × 7 days × 24 hours)
- [x] Queue repository
- [x] Crowd level service
- [x] Prediction algorithm with adjustments (holiday, events, delays)
- [x] API endpoints (4 routes)
- [x] Frontend queue dashboard
- [x] Tests (85 passing)

### Key Metrics
- **Total Tests**: 371 passing (25 core + 179 autoclaim + 82 seatmap + 85 euroqueue)
- **Packages**: 4 (core, autoclaim, seatmap, euroqueue)
- **Apps**: 1 (web)
- **Build**: 5 packages, all successful

### Code Changes (This Session)
- `packages/seatmap/` — Full seat intelligence package
- `packages/euroqueue/` — Full queue prediction package
- `packages/autoclaim/src/api/handlers/seats.handler.ts` — Seat API routes
- `packages/autoclaim/src/api/handlers/queue.handler.ts` — Queue API routes
- `apps/web/src/app/seatmap/` — Seat map page
- `apps/web/src/app/queue/` — Queue dashboard page
- `apps/web/src/components/seatmap/` — Seat map components
- `apps/web/src/components/queue/` — Queue components

### Meta-Orchestration Pattern Used
This session used nested Claude Code instances via CLI:
```bash
claude -p "PROMPT" --permission-mode bypassPermissions --max-budget-usd 3.00
```

This allowed the orchestrator instance to automatically run implementation prompts.

---

## Architecture Notes

### Data Flow (Updated: January 6, 2026)
```
┌─────────────────────────────────────────────────────────────┐
│                     Eurostar Tools                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: AutoClaim                                         │
│  GTFS-RT (30s) → BullMQ Worker → PostgreSQL → API → Web     │
│                       ↓                                     │
│                 Delay Detection → Notifications             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 2: RailSeatMap                                       │
│  Static Data → Seat Repository → Recommendation → API → Web │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 3: EuroQueue                                         │
│  Historical Baseline → Prediction Service → API → Web       │
│        ↓                                                    │
│  Real-time adjustments (holidays, events, delays)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Package Structure
```
eurostar-tools/
├── packages/
│   ├── core/          # GTFS polling, DB, queue infrastructure
│   ├── autoclaim/     # Email parser, delay monitor, claims, API
│   ├── seatmap/       # Seat data, recommendation algorithm
│   └── euroqueue/     # Queue prediction, historical data
├── apps/
│   └── web/           # Next.js dashboard with all features
└── docker-compose.yml
```

### Key Files
- `packages/core/src/gtfs/poller.ts` — GTFS-RT polling
- `packages/autoclaim/src/api/app.ts` — Main Fastify server
- `packages/seatmap/src/services/recommendation.service.ts` — Seat scoring
- `packages/euroqueue/src/services/prediction.service.ts` — Queue prediction

### Environment Variables
```
DATABASE_URL=postgresql://eurostar:eurostar_dev@localhost:5432/eurostar
REDIS_URL=redis://localhost:6379
GTFS_POLL_INTERVAL_MS=30000
```

---

## API Routes Summary

### AutoClaim (Phase 1)
```
GET    /api/v1/health
GET    /api/v1/bookings
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
DELETE /api/v1/bookings/:id
GET    /api/v1/claims
GET    /api/v1/claims/:id
```

### RailSeatMap (Phase 2)
```
GET    /api/v1/seats/:trainType/coaches
GET    /api/v1/seats/:trainType/coach/:coachNumber
GET    /api/v1/seats/:trainType/:coach/:seatNumber
POST   /api/v1/seats/:trainType/recommend
```

### EuroQueue (Phase 3)
```
GET    /api/v1/queue/terminals
GET    /api/v1/queue/:terminal/current
GET    /api/v1/queue/:terminal/timeline?hours=12
POST   /api/v1/queue/:terminal/best-arrival
```

---

## Testing Notes

### Test Commands
```bash
pnpm test                    # Run all tests (371 passing)
pnpm test:watch              # Watch mode
pnpm test --filter=seatmap   # Single package
pnpm build                   # Build all packages
pnpm dev                     # Start dev server
```

### Test Coverage by Package
| Package | Tests | Coverage |
|---------|-------|----------|
| core | 25 | GTFS polling, parsing |
| autoclaim | 179 | Email, delay, eligibility, claims, notifications, API |
| seatmap | 82 | Types, seat data, recommendations |
| euroqueue | 85 | Types, baseline, repository, crowd level, prediction |

---

## Future Improvements

### Phase 1 (AutoClaim)
- [ ] Real Resend email integration
- [ ] JWT authentication implementation
- [ ] E2E tests with Playwright

### Phase 2 (RailSeatMap)
- [ ] Add e300, classic, ruby train types
- [ ] Seat images/SVG visualization
- [ ] User reviews/ratings for seats

### Phase 3 (EuroQueue)
- [ ] Real-time data integration (Google Popular Times API)
- [ ] User-submitted wait time reports
- [ ] Push notifications for queue alerts

### Infrastructure
- [ ] Production deployment (Railway/Fly.io)
- [ ] CI/CD pipeline
- [ ] Monitoring and alerting

---

## Deployment Notes

### Local Development
```bash
docker compose up -d redis postgres  # Start dependencies
pnpm dev                             # Start all services
```

### Staging
- URL: https://staging.eurostar-tools.com
- Last deployed: Not yet

### Production
- URL: https://eurostar-tools.com
- Last deployed: Not yet
