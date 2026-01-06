# Testing Patterns for Eurostar Tools

## Testing Stack

- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Database**: Testcontainers (PostgreSQL)
- **Mocking**: msw (Mock Service Worker) for HTTP
- **Factories**: @faker-js/faker + custom factories

## Directory Structure

```
packages/autoclaim/
├── src/
│   ├── services/
│   │   └── claim.service.ts
│   └── ...
├── test/
│   ├── unit/
│   │   └── claim.service.test.ts
│   ├── integration/
│   │   └── claim.api.test.ts
│   ├── fixtures/
│   │   ├── gtfs/
│   │   │   ├── on-time.json
│   │   │   └── delayed-85min.json
│   │   └── emails/
│   │       ├── standard-booking.txt
│   │       └── forwarded-booking.txt
│   └── factories/
│       ├── booking.factory.ts
│       └── train.factory.ts
└── vitest.config.ts
```

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['test/**', '**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Test Setup

```typescript
// test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// MSW server for HTTP mocking
export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Factory Pattern

```typescript
// test/factories/booking.factory.ts
import { faker } from '@faker-js/faker';
import type { Booking } from '@/models/booking';

export function createBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    pnr: faker.string.alphanumeric(6).toUpperCase(),
    tcn: `IV${faker.string.numeric(9)}`,
    trainNumber: faker.helpers.arrayElement(['9007', '9024', '9114']),
    journeyDate: faker.date.future(),
    origin: 'GBSPX',
    destination: 'FRPLY',
    passengerName: faker.person.fullName(),
    coach: faker.number.int({ min: 1, max: 16 }),
    seat: faker.number.int({ min: 1, max: 60 }).toString(),
    finalDelayMinutes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createDelayedBooking(delayMinutes: number): Booking {
  return createBooking({
    journeyDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    finalDelayMinutes: delayMinutes,
  });
}
```

```typescript
// test/factories/train.factory.ts
import { faker } from '@faker-js/faker';
import type { Train } from '@/models/train';

export function createTrain(overrides: Partial<Train> = {}): Train {
  const trainNumber = overrides.trainNumber ?? '9007';
  const date = overrides.date ?? new Date();

  return {
    id: faker.string.uuid(),
    tripId: `${trainNumber}-${formatMMDD(date)}`,
    trainNumber,
    date,
    scheduledDeparture: new Date(date.setHours(8, 1, 0, 0)),
    scheduledArrival: new Date(date.setHours(11, 17, 0, 0)),
    actualArrival: null,
    delayMinutes: null,
    trainType: 'e320',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function formatMMDD(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}
```

## Unit Test Examples

### Testing Pure Functions
```typescript
// test/unit/eligibility.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCompensation } from '@/services/eligibility.service';

describe('calculateCompensation', () => {
  it('returns 25% cash for 60-119 minute delays', () => {
    const result = calculateCompensation({
      delayMinutes: 75,
      ticketPrice: 100,
    });

    expect(result.cashAmount).toBe(25);
    expect(result.voucherAmount).toBe(60);
  });

  it('returns 50% cash for 120-179 minute delays', () => {
    const result = calculateCompensation({
      delayMinutes: 150,
      ticketPrice: 100,
    });

    expect(result.cashAmount).toBe(50);
    expect(result.voucherAmount).toBe(60);
  });

  it('returns 50% cash / 75% voucher for 180+ minute delays', () => {
    const result = calculateCompensation({
      delayMinutes: 200,
      ticketPrice: 100,
    });

    expect(result.cashAmount).toBe(50);
    expect(result.voucherAmount).toBe(75);
  });

  it('returns null if delay under 60 minutes', () => {
    const result = calculateCompensation({
      delayMinutes: 45,
      ticketPrice: 100,
    });

    expect(result).toBeNull();
  });

  it('returns null if compensation under €4 minimum', () => {
    const result = calculateCompensation({
      delayMinutes: 65,
      ticketPrice: 10, // 25% = €2.50 < €4 minimum
    });

    expect(result).toBeNull();
  });
});
```

### Testing Services with Mocks
```typescript
// test/unit/claim.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaimService } from '@/services/claim.service';
import { createDelayedBooking } from '../factories/booking.factory';

describe('ClaimService', () => {
  let claimService: ClaimService;
  let mockRepository: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findByBookingId: vi.fn(),
      update: vi.fn(),
    };
    mockNotificationService = {
      sendClaimEligibleEmail: vi.fn(),
    };

    claimService = new ClaimService(mockRepository, mockNotificationService);
  });

  it('creates claim for eligible booking', async () => {
    const booking = createDelayedBooking(85);
    mockRepository.create.mockResolvedValue({ id: 'claim-123' });

    const result = await claimService.createClaim(booking);

    expect(result.isOk()).toBe(true);
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: booking.id,
        delayMinutes: 85,
        status: 'eligible',
      })
    );
  });

  it('sends notification when claim created', async () => {
    const booking = createDelayedBooking(85);
    mockRepository.create.mockResolvedValue({ id: 'claim-123' });

    await claimService.createClaim(booking);

    expect(mockNotificationService.sendClaimEligibleEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: booking.id,
      })
    );
  });

  it('rejects claim creation within 24h window', async () => {
    const booking = createDelayedBooking(85);
    booking.journeyDate = new Date(); // Today, not 24h ago

    const result = await claimService.createClaim(booking);

    expect(result.isErr()).toBe(true);
    expect(result.error?.code).toBe('CLAIM_WINDOW_NOT_OPEN');
  });
});
```

## Integration Test Examples

### Testing API Routes
```typescript
// test/integration/bookings.api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createApp } from '@/app';
import { migrate } from '@/db/migrate';

describe('Bookings API', () => {
  let container: StartedPostgreSqlContainer;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();

    process.env.DATABASE_URL = container.getConnectionUri();
    await migrate();

    app = createApp();
    await app.ready();
  }, 60_000); // Testcontainers can be slow to start

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('POST /api/v1/bookings creates booking from email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        Authorization: 'Bearer test-token',
      },
      payload: {
        emailBody: `
          Booking Reference: ABC123
          Ticket Number: IV123456789
          Train: Eurostar 9007
          Date: 05 January 2026
        `,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      data: {
        pnr: 'ABC123',
        tcn: 'IV123456789',
        trainNumber: '9007',
      },
    });
  });

  it('returns 400 for invalid email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        Authorization: 'Bearer test-token',
      },
      payload: {
        emailBody: 'This is not a valid booking email',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'INVALID_EMAIL_FORMAT',
      },
    });
  });
});
```

## E2E Test Examples

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test
```typescript
// e2e/claim-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Claim Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data
    await page.request.post('/api/test/seed', {
      data: {
        booking: {
          pnr: 'TEST01',
          trainNumber: '9007',
          journeyDate: '2026-01-04', // Yesterday
          delayMinutes: 85,
        },
      },
    });

    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('shows eligible claim with compensation amount', async ({ page }) => {
    await page.goto('/dashboard');

    // Find the delayed booking
    const booking = page.locator('[data-testid="booking-TEST01"]');
    await expect(booking).toContainText('Delayed 85 minutes');
    await expect(booking).toContainText('Claim eligible');

    // Click to view claim
    await booking.click();
    await expect(page).toHaveURL(/\/claims\/[\w-]+/);

    // Verify compensation amounts
    await expect(page.locator('[data-testid="cash-amount"]')).toContainText('25%');
    await expect(page.locator('[data-testid="voucher-amount"]')).toContainText('60%');
  });

  test('can copy claim details to clipboard', async ({ page }) => {
    await page.goto('/claims/test-claim-id');

    // Click copy button for PNR
    await page.click('[data-testid="copy-pnr"]');

    // Verify toast notification
    await expect(page.locator('.toast')).toContainText('Copied to clipboard');
  });

  test('can mark claim as submitted', async ({ page }) => {
    await page.goto('/claims/test-claim-id');

    await page.click('[data-testid="mark-submitted"]');

    // Confirm dialog
    await page.click('[data-testid="confirm-submit"]');

    // Verify status updated
    await expect(page.locator('[data-testid="claim-status"]')).toContainText('Submitted');
  });
});
```

## GTFS-RT Mocking

### MSW Handler
```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import onTimeData from '../fixtures/gtfs/on-time.bin';
import delayedData from '../fixtures/gtfs/delayed-85min.bin';

let mockGtfsData = onTimeData;

export const handlers = [
  http.get(
    'https://integration-storage.dm.eurostar.com/gtfs-prod/gtfs_rt_v2.bin',
    () => {
      return HttpResponse.arrayBuffer(mockGtfsData, {
        headers: { 'Content-Type': 'application/x-protobuf' },
      });
    }
  ),
];

// Helper to switch fixtures in tests
export function setGtfsFixture(fixture: 'on-time' | 'delayed') {
  mockGtfsData = fixture === 'delayed' ? delayedData : onTimeData;
}
```

### Using in Tests
```typescript
import { setGtfsFixture } from '../mocks/handlers';

describe('Delay Monitor', () => {
  it('detects delayed trains from GTFS feed', async () => {
    setGtfsFixture('delayed');

    await delayMonitor.check();

    const booking = await bookingRepository.findByPnr('TEST01');
    expect(booking.finalDelayMinutes).toBe(85);
  });
});
```

## Time Travel for 24h Window

```typescript
// test/utils/time.ts
import { vi } from 'vitest';

export function advanceTime(ms: number): void {
  vi.advanceTimersByTime(ms);
}

export function advanceHours(hours: number): void {
  advanceTime(hours * 60 * 60 * 1000);
}

// Usage in tests
describe('Claim Window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens claim window after 24 hours', async () => {
    const booking = createDelayedBooking(85);
    booking.journeyDate = new Date(); // Now

    // Initially not eligible
    expect(claimService.isEligibleForClaim(booking)).toBe(false);

    // Advance 24 hours
    advanceHours(24);

    // Now eligible
    expect(claimService.isEligibleForClaim(booking)).toBe(true);
  });
});
```

## Coverage Requirements

Enforce these thresholds in CI:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test:coverage
  env:
    MIN_COVERAGE: 80

- name: Check coverage thresholds
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < $MIN_COVERAGE" | bc -l) )); then
      echo "Coverage $COVERAGE% is below threshold $MIN_COVERAGE%"
      exit 1
    fi
```
