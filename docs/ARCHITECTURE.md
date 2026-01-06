# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EUROSTAR TOOLS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   FRONTEND   │     │     API      │     │      BACKGROUND WORKERS      │ │
│  │              │     │              │     │                              │ │
│  │  Next.js 14  │────▶│   Fastify    │◀───▶│  GTFS Worker    Delay Worker │ │
│  │  (App Router)│     │   REST API   │     │  Email Worker   Reminder     │ │
│  │              │     │              │     │                              │ │
│  └──────────────┘     └──────┬───────┘     └──────────────┬───────────────┘ │
│         │                    │                            │                  │
│         │                    ▼                            │                  │
│         │            ┌───────────────┐                    │                  │
│         │            │  PostgreSQL   │◀───────────────────┘                  │
│         │            │  (Drizzle)    │                                       │
│         │            └───────────────┘                                       │
│         │                    │                                               │
│         │                    ▼                                               │
│         │            ┌───────────────┐                                       │
│         └───────────▶│    Redis      │◀──────────────────────────────────────│
│                      │   (BullMQ)    │                                       │
│                      └───────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              EXTERNAL SERVICES
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐   │
│  │  Eurostar GTFS   │    │   Resend Email   │    │   Eurostar Claims    │   │
│  │   (30s poll)     │    │      API         │    │      Portal          │   │
│  └──────────────────┘    └──────────────────┘    └──────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Package Dependencies

```
eurostar-tools/
├── apps/
│   └── web/                    @eurostar/web (Next.js 14)
│       ├── @eurostar/core
│       └── @eurostar/autoclaim
│
└── packages/
    ├── core/                   @eurostar/core (Shared infrastructure)
    │   └── (no internal deps)
    │
    ├── autoclaim/              @eurostar/autoclaim (Main application)
    │   ├── @eurostar/core
    │   ├── @eurostar/euroqueue
    │   └── @eurostar/seatmap
    │
    ├── euroqueue/              @eurostar/euroqueue (Queue prediction)
    │   └── @eurostar/core
    │
    └── seatmap/                @eurostar/seatmap (Seat intelligence)
        └── @eurostar/core
```

### Dependency Graph (Visual)

```
                    ┌─────────────────┐
                    │  @eurostar/web  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌───────────────────┐         ┌─────────────────┐
    │ @eurostar/autoclaim│         │ @eurostar/core  │
    └─────────┬─────────┘         └────────▲────────┘
              │                            │
    ┌─────────┼─────────┐                  │
    │         │         │                  │
    ▼         ▼         ▼                  │
┌────────┐ ┌────────┐ ┌─────────────────┐  │
│seatmap │ │euroqueue│ │     core        │──┘
└────┬───┘ └────┬───┘ └─────────────────┘
     │          │
     └──────────┴──────────────────────────┘
              (all depend on core)
```

## Data Flow Diagrams

### GTFS Real-Time Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GTFS-RT DATA PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Eurostar GTFS  │
    │   RT Endpoint   │
    │  (30s updates)  │
    └────────┬────────┘
             │ Protocol Buffers
             ▼
    ┌─────────────────┐
    │   GTFS Client   │  packages/core/src/gtfs/client.ts
    │   (HTTP fetch)  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   GTFS Parser   │  packages/core/src/gtfs/parser.ts
    │ (protobuf→JSON) │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   GTFS Sync     │  packages/core/src/gtfs/sync.ts
    │  (upsert DB)    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   PostgreSQL    │
    │  trains table   │
    └─────────────────┘
```

### Claim Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLAIM PROCESSING PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ User uploads │     │ Email Parser │     │   Booking    │
│confirmation  │────▶│  extracts:   │────▶│   Created    │
│   email      │     │ PNR, TCN,    │     │   in DB      │
└──────────────┘     │ train, date  │     └──────┬───────┘
                     └──────────────┘            │
                                                 │ Journey completes
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Claim      │     │ Eligibility  │     │Delay Monitor │
│  Generated   │◀────│  Calculator  │◀────│   Worker     │
│              │     │ (60+ min?)   │     │ (matches to  │
└──────┬───────┘     └──────────────┘     │  GTFS data)  │
       │                                   └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Notification │     │    Email     │     │    User      │
│   Worker     │────▶│   Service    │────▶│   Notified   │
│              │     │  (Resend)    │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### API Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API REQUEST FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    Client Request
          │
          ▼
    ┌─────────────────┐
    │   Fastify App   │  packages/autoclaim/src/api/app.ts
    └────────┬────────┘
             │
    ┌────────┼────────┬─────────────────┐
    │        │        │                 │
    ▼        ▼        ▼                 ▼
┌────────┐ ┌────────┐ ┌────────┐   ┌────────┐
│  CORS  │ │  Rate  │ │  JWT   │   │ Error  │
│        │ │ Limit  │ │  Auth  │   │Handler │
└────┬───┘ └────┬───┘ └────┬───┘   └────────┘
     │          │          │
     └──────────┴──────────┘
                │
                ▼
    ┌─────────────────┐
    │  Route Handler  │  /api/v1/bookings, /api/v1/claims, etc.
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │    Service      │  *.service.ts (business logic)
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   Repository    │  *.repository.ts (Drizzle queries)
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   PostgreSQL    │
    └─────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                  users                                        │
├──────────────────┬───────────────────┬───────────────────────────────────────┤
│ id               │ uuid (PK)         │ Primary key                           │
│ email            │ varchar (unique)  │ User email address                    │
│ password_hash    │ text              │ bcrypt hashed password                │
│ email_verified   │ boolean           │ Verification status                   │
│ verification_token│ text             │ Email verification token              │
│ created_at       │ timestamp         │ Account creation time                 │
│ updated_at       │ timestamp         │ Last update time                      │
└──────────────────┴───────────────────┴───────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 bookings                                      │
├──────────────────┬───────────────────┬───────────────────────────────────────┤
│ id               │ uuid (PK)         │ Primary key                           │
│ user_id          │ uuid (FK→users)   │ Owner reference                       │
│ pnr              │ varchar(6)        │ Booking reference (e.g., "ABC123")    │
│ tcn              │ varchar(12)       │ Ticket number (IV/15 + 9 digits)      │
│ train_id         │ uuid (FK→trains)  │ Train reference                       │
│ train_number     │ varchar(4)        │ Train number (e.g., "9012")           │
│ journey_date     │ date              │ Date of travel                        │
│ origin           │ varchar(3)        │ Departure station code                │
│ destination      │ varchar(3)        │ Arrival station code                  │
│ passenger_name   │ text              │ Traveler name                         │
│ coach            │ varchar(2)        │ Coach number                          │
│ seat             │ varchar(3)        │ Seat number                           │
│ final_delay_mins │ integer           │ Final recorded delay                  │
└──────────────────┴───────────────────┴───────────────────────────────────────┘
         │                                            ▲
         │ 1:1                                        │ N:1
         ▼                                            │
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  claims                                       │
├──────────────────┬───────────────────┬───────────────────────────────────────┤
│ id               │ uuid (PK)         │ Primary key                           │
│ booking_id       │ uuid (FK, unique) │ Associated booking                    │
│ delay_minutes    │ integer           │ Delay at arrival                      │
│ eligible_cash    │ decimal           │ Cash compensation amount              │
│ eligible_voucher │ decimal           │ Voucher compensation amount           │
│ status           │ claim_status_enum │ pending/eligible/submitted/approved   │
│ submitted_at     │ timestamp         │ When claim was submitted              │
│ created_at       │ timestamp         │ Record creation time                  │
│ updated_at       │ timestamp         │ Last update time                      │
└──────────────────┴───────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                  trains                                       │
├──────────────────┬───────────────────┬───────────────────────────────────────┤
│ id               │ uuid (PK)         │ Primary key                           │
│ trip_id          │ varchar (unique)  │ GTFS trip ID (trainNumber-MMDD)       │
│ train_number     │ varchar(4)        │ Train number (normalized)             │
│ date             │ date              │ Service date                          │
│ scheduled_dep    │ timestamp         │ Scheduled departure (UTC)             │
│ scheduled_arr    │ timestamp         │ Scheduled arrival (UTC)               │
│ actual_arrival   │ timestamp         │ Actual arrival time (UTC)             │
│ delay_minutes    │ integer           │ Calculated delay                      │
│ train_type       │ train_type_enum   │ e320/e300/classic/ruby                │
└──────────────────┴───────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                 sessions                                      │
├──────────────────┬───────────────────┬───────────────────────────────────────┤
│ id               │ uuid (PK)         │ Primary key                           │
│ user_id          │ uuid (FK→users)   │ Session owner                         │
│ token            │ text (unique)     │ Refresh token                         │
│ expires_at       │ timestamp         │ Token expiration                      │
│ user_agent       │ text              │ Client user agent                     │
│ ip_address       │ varchar(45)       │ Client IP                             │
│ created_at       │ timestamp         │ Session start time                    │
└──────────────────┴───────────────────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                             user_preferences                                  │
├──────────────────┬───────────────────┬───────────────────────────────────────┤
│ id               │ uuid (PK)         │ Primary key                           │
│ user_id          │ uuid (FK, unique) │ Preference owner                      │
│ seat_preferences │ jsonb             │ Window/aisle/table preferences        │
│ queue_notifs     │ boolean           │ Enable queue alerts                   │
│ default_terminal │ terminal_enum     │ Home terminal                         │
│ preferred_comp   │ comp_type_enum    │ cash/voucher preference               │
│ created_at       │ timestamp         │ Record creation time                  │
│ updated_at       │ timestamp         │ Last update time                      │
└──────────────────┴───────────────────┴───────────────────────────────────────┘

                              ENUMS
┌────────────────────────────────────────────────────────────────┐
│ train_type_enum:   'e320' | 'e300' | 'classic' | 'ruby'        │
│ claim_status_enum: 'pending' | 'eligible' | 'submitted' |      │
│                    'approved' | 'rejected' | 'expired'         │
│ comp_type_enum:    'cash' | 'voucher'                          │
│ terminal_enum:     'st_pancras' | 'paris_nord' |               │
│                    'brussels_midi' | 'amsterdam_centraal'      │
└────────────────────────────────────────────────────────────────┘
```

### Entity Relationships

```
users ──────┬──── 1:N ────▶ bookings ──── N:1 ────▶ trains
            │                   │
            │                   │
            ├──── 1:N ────▶ sessions
            │
            └──── 1:1 ────▶ user_preferences

bookings ──── 1:1 ────▶ claims
```

## Key Components

### @eurostar/core

The foundation package providing shared infrastructure:

| Component | Path | Purpose |
|-----------|------|---------|
| Database | `db/` | PostgreSQL connection, Drizzle schema, migrations |
| Queue | `queue/` | BullMQ workers and schedulers |
| GTFS | `gtfs/` | Real-time train data fetching and parsing |
| Auth | `auth/` | JWT authentication, password hashing |
| Email | `email/` | Resend integration, email templates |
| Result | `result.ts` | Functional error handling type |
| Config | `config/` | Environment variable validation (Zod) |
| Logging | `logging/` | Pino logger configuration |

### @eurostar/autoclaim

The main application server:

| Component | Path | Purpose |
|-----------|------|---------|
| Email Parser | `email-parser/` | Extract booking data from confirmation emails |
| Delay Monitor | `delay-monitor/` | Match bookings to trains, check delays |
| Eligibility | `eligibility/` | Calculate compensation amounts |
| Claim Generator | `claim-generator/` | Generate pre-filled claim forms |
| Notifications | `notifications/` | Send eligibility and reminder emails |
| API | `api/` | Fastify REST endpoints |
| Server | `server.ts` | Application entry point, orchestration |

### @eurostar/seatmap

Seat intelligence and recommendations:

| Component | Path | Purpose |
|-----------|------|---------|
| Train Data | `data/` | Static seat maps for E320, E300, Classic, Ruby |
| Recommendations | `services/` | Score seats based on user preferences |

### @eurostar/euroqueue

Queue prediction at terminals:

| Component | Path | Purpose |
|-----------|------|---------|
| Terminal Data | `data/` | Terminal configs, historical baselines |
| Repository | `repository/` | Historical queue data access |
| Prediction | `services/` | Queue time forecasting, optimal arrival |

### @eurostar/web

Next.js 14 frontend:

| Component | Path | Purpose |
|-----------|------|---------|
| App Router | `app/` | Pages and API routes |
| Components | `components/` | Reusable React components (shadcn/ui) |
| Providers | `providers/` | Auth and theme context providers |
| Hooks | `hooks/` | Custom React hooks |

## Background Workers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKGROUND WORKERS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┬─────────────────────┬────────────────────────────────┐
│ Worker              │ Queue               │ Schedule/Trigger               │
├─────────────────────┼─────────────────────┼────────────────────────────────┤
│ GTFS Worker         │ gtfs-queue          │ Every 30 seconds               │
│ Delay Check Worker  │ delay-check-queue   │ Every 5 minutes                │
│ Email Notification  │ email-notif-queue   │ On claim eligibility           │
│ Claim Reminder      │ claim-reminder-queue│ 48h before deadline            │
└─────────────────────┴─────────────────────┴────────────────────────────────┘

                        Worker Data Flow

    ┌────────────┐          ┌────────────┐          ┌────────────┐
    │   Redis    │◀────────▶│  BullMQ    │◀────────▶│  Workers   │
    │   Queue    │          │ Scheduler  │          │            │
    └────────────┘          └────────────┘          └─────┬──────┘
                                                          │
                                                          ▼
                                                   ┌────────────┐
                                                   │ PostgreSQL │
                                                   └────────────┘
```

## Compensation Rules

| Delay | Cash | Voucher |
|-------|------|---------|
| 60-119 min | 25% of fare | 60% of fare |
| 120-179 min | 50% of fare | 60% of fare |
| 180+ min | 50% of fare | 75% of fare |

- **Claim Window**: Opens 24 hours after journey completion
- **Deadline**: 6 months from journey date
- **Minimum Payout**: EUR 20 (or GBP equivalent)

## Train ID Normalization

Eurostar uses different formats in UK vs EU systems:

```
UK Format:  9Oxx (letter O) → normalize to 90xx
EU Format:  90xx (digit 0) → keep as-is
Storage:    Always 4-digit string, zero-padded
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/bookings` | List user bookings |
| POST | `/api/v1/bookings` | Create booking from email |
| GET | `/api/v1/bookings/:id` | Get booking details |
| GET | `/api/v1/claims` | List user claims |
| GET | `/api/v1/claims/:id` | Get claim details |
| PATCH | `/api/v1/claims/:id` | Update claim status |
| GET | `/api/v1/queue/:terminal` | Queue prediction |
| GET | `/api/v1/seats/:trainType` | Seat recommendations |
| GET | `/api/v1/preferences` | Get user preferences |
| PATCH | `/api/v1/preferences` | Update preferences |
| GET | `/api/health` | Liveness probe |
| GET | `/api/readiness` | Readiness probe |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   Cloudflare    │
                         │   (CDN + WAF)   │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌────────────────┐         ┌────────────────┐
           │   Fly.io/      │         │   Fly.io/      │
           │   Railway      │         │   Railway      │
           │   (Web App)    │         │   (API Server) │
           │   Port 3000    │         │   Port 3001    │
           └────────────────┘         └───────┬────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
           ┌────────────────┐         ┌────────────────┐       ┌────────────────┐
           │   PostgreSQL   │         │     Redis      │       │   Workers      │
           │   (Managed)    │         │   (Managed)    │       │   (Fly.io)     │
           └────────────────┘         └────────────────┘       └────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing key (32+ chars) |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `GTFS_ENDPOINT` | No | GTFS-RT feed URL |
| `GTFS_POLL_INTERVAL_MS` | No | Poll interval (default: 30000) |
| `CORS_ORIGIN` | No | Allowed CORS origin |
| `PORT` | No | API server port (default: 3001) |

## File Naming Conventions

```
*.service.ts     — Business logic (pure functions preferred)
*.repository.ts  — Database access (Drizzle queries)
*.handler.ts     — API route handlers
*.worker.ts      — BullMQ background job processors
*.schema.ts      — Zod validation schemas
*.types.ts       — TypeScript type definitions
```

## Error Handling Pattern

All service methods return a `Result<T, E>` type for explicit error handling:

```typescript
import { Result, ok, err } from '@eurostar/core/result';

// Service returns Result
async function parseBooking(email: string): Promise<Result<Booking, ParseError>> {
  if (!email) {
    return err(new ParseError('Empty email content'));
  }
  // ... parsing logic
  return ok(booking);
}

// Handler converts to HTTP response
const result = await parseBooking(email);
if (result.isErr()) {
  return reply.status(400).send({ error: result.error.message });
}
return reply.send({ data: result.value });
```
