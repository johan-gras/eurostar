# Draft to Production Plan

> **Orchestration Guide**: This plan is designed to be executed by an orchestrator Claude instance controlling nested Claude Code instances via CLI. Never execute prompts directly - always use the meta-orchestration pattern.

## Meta-Orchestration Pattern

```bash
# Standard pattern for all prompts (capture session ID for potential resume)
SESSION_ID=$(claude -p "PROMPT" \
  --permission-mode bypassPermissions \
  --max-budget-usd [BUDGET] \
  --output-format json 2>&1 | jq -r '.session_id // empty')

# For text output (when you don't need session ID):
claude -p "PROMPT" \
  --permission-mode bypassPermissions \
  --max-budget-usd [BUDGET] \
  --output-format text

# Resume a specific session if needed:
claude --resume $SESSION_ID -p "Continue with next step"

# After each prompt, verify:
pnpm build && pnpm test
```

### CLI Best Practices (from research)
- Use `--output-format json` to capture session IDs for resumption
- Use `--resume <id>` instead of `-c` for reliable session continuity
- Context compaction may occur on large tasks (~2 min pause, may lose some context)
- Create reusable prompt templates in `.claude/commands/` to reduce token usage
- Set `BASH_DEFAULT_TIMEOUT_MS` for long-running commands

### Sandboxing Note
The `--permission-mode bypassPermissions` flag should only be used in trusted environments.
For production CI/CD, consider using `acceptEdits` mode with explicit tool allowlists.

## Key Lessons Applied

1. **Small, focused prompts** - One component/feature per prompt
2. **Explicit context** - Include file paths, line numbers, existing patterns
3. **Visual verification** - Screenshot after each UI change
4. **Checkpoint after each phase** - Don't proceed if verification fails

---

## Domain Knowledge (Verified via Research)

### Eurostar Compensation Rules (Updated 2023)
> **Regulation Update**: EC 1371/2007 was replaced by **EU 2021/782** on 7 June 2023.

| Delay | Compensation |
|-------|-------------|
| 60-119 min | 25% of ticket price |
| 120+ min | 50% of ticket price |

**Key Rules**:
- Minimum compensation threshold: EUR 4
- Claim deadline: **60 days** after travel date
- Payment timeline: Within 28 days of claim receipt
- For return tickets: compensation based on half the ticket price
- **Force majeure exemptions** now exist (pandemics, extreme weather)
- Cash or voucher options available (Eurostar offers higher rates for vouchers)

### Playwright + Next.js 14 Best Practices
- Use built-in `await expect(page).toHaveScreenshot()` for visual regression
- **Mask dynamic elements** (timestamps, counters) to prevent false positives
- Use `webServer` config in playwright.config.ts to auto-start dev server
- Run in **Docker containers** for CI consistency (font/OS rendering differences)
- **MSW limitation**: Server-side mocking doesn't work in Next.js 14 App Router (fixed in Next.js 15)
- Configure tolerance: `maxDiffPixels` or `maxDiffPixelRatio`

### Fastify JWT Best Practices
- Store tokens in **HTTP-only cookies** (not localStorage) to prevent XSS
- Use `@fastify/cookie` alongside `@fastify/jwt`
- Use `onlyCookie` option for refresh token storage
- Implement **token blacklisting** via Redis for logout
- Consider asymmetric algorithms (RS256/ES256) for production
- Refresh token rotation: issue new refresh token with each access token refresh

---

## Phase Overview

| Phase | Focus | Prompts | Budget | Duration |
|-------|-------|---------|--------|----------|
| 1 | Testing Foundation | 8 | $16 | First |
| 2 | Authentication & Security | 10 | $25 | Second |
| 3 | UI Polish - AutoClaim | 12 | $24 | Third |
| 4 | UI Polish - SeatMap | 10 | $20 | Fourth |
| 5 | UI Polish - EuroQueue | 8 | $16 | Fifth |
| 6 | Feature Completion | 15 | $35 | Sixth |
| 7 | Real Integrations | 8 | $20 | Seventh |
| 8 | Performance & Error Handling | 10 | $20 | Eighth |
| 9 | Deployment & CI/CD | 8 | $16 | Ninth |
| 10 | Documentation | 5 | $10 | Last |
| **Total** | | **94** | **~$200** | |

---

## Phase 1: Testing Foundation

**Goal**: Set up Playwright for E2E testing with screenshot capture workflow.

### Prompt 1.1: Playwright Setup
```
Budget: $2.00

Install and configure Playwright in apps/web:

1. Run: pnpm add -D @playwright/test --filter=@eurostar/web
2. Run: pnpm exec playwright install chromium --filter=@eurostar/web

3. Create apps/web/playwright.config.ts with these key settings:
   - baseURL: http://localhost:3000
   - testDir: './e2e'
   - screenshot: 'only-on-failure'
   - video: 'retain-on-failure'
   - projects: [chromium desktop (1280x720), chromium mobile (375x667)]
   - IMPORTANT: Add webServer config to auto-start Next.js:
     webServer: {
       command: 'pnpm dev',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
       timeout: 120000,
     }
   - Add toHaveScreenshot defaults:
     expect: {
       toHaveScreenshot: { maxDiffPixelRatio: 0.01 }
     }

4. Create apps/web/e2e/example.spec.ts:
   - Test: homepage redirects to /dashboard
   - Test: dashboard page loads
   - Use page.waitForLoadState('networkidle') before assertions

5. Add scripts to apps/web/package.json:
   - "e2e": "playwright test"
   - "e2e:ui": "playwright test --ui"
   - "e2e:headed": "playwright test --headed"
   - "e2e:update-snapshots": "playwright test --update-snapshots"

6. Create apps/web/e2e/fixtures/test-utils.ts with helpers:
   - waitForPageReady(page) - waits for networkidle + fonts loaded
   - maskDynamicContent(page) - masks timestamps, counters before screenshots

Run 'pnpm e2e --filter=@eurostar/web' to verify.
```

**Verification**:
- [ ] `playwright.config.ts` exists
- [ ] `e2e/` directory created
- [ ] Package.json has e2e scripts

### Prompt 1.2: Screenshot Workflow
```
Budget: $2.00

Create a screenshot capture system in apps/web/e2e/:

1. Create e2e/screenshots/.gitkeep (directory for screenshots)

2. Create e2e/helpers/screenshot.ts:
   - captureScreenshot(page, name, options?)
   - Options: fullPage, clip, mask (for dynamic content)
   - Saves to e2e/screenshots/{name}-{viewport}.png
   - Viewport suffix: desktop or mobile

3. Create e2e/visual-baseline.spec.ts:
   - Capture baseline screenshots of all pages:
     * dashboard (empty state)
     * bookings (empty state)
     * claims (empty state)
     * seatmap (default view)
     * queue (default view)
   - Use test.describe.serial to run in order

4. Add to .gitignore:
   - apps/web/e2e/screenshots/*.png
   - apps/web/playwright-report/
   - apps/web/test-results/

Verify by running: pnpm e2e:headed --filter=@eurostar/web
Note: Requires dev server running on port 3000.
```

**Verification**:
- [ ] Screenshot helper exists
- [ ] Visual baseline test file created
- [ ] .gitignore updated

### Prompt 1.3: Navigation E2E Tests
```
Budget: $2.00

Create E2E tests for navigation in apps/web/e2e/navigation.spec.ts:

The app uses Header.tsx (apps/web/src/components/layout/Header.tsx) for navigation.
Navigation items are defined at lines 10-16:
- Dashboard (/dashboard)
- Bookings (/bookings)
- Claims (/claims)
- Seat Map (/seatmap)
- Queue Times (/queue)

Tests to write:
1. Test each nav link navigates to correct page
2. Test active state highlights current page
3. Test mobile menu opens/closes (viewport 375x667)
4. Test mobile nav links work
5. Screenshot each page after navigation (use screenshotPage helper)

Use test.beforeEach to navigate to dashboard first.
```

**Verification**:
- [ ] Navigation tests pass
- [ ] Screenshots captured for each page
- [ ] Mobile viewport tested

### Prompt 1.4: Dashboard E2E Tests
```
Budget: $2.00

Create E2E tests for the dashboard in apps/web/e2e/dashboard.spec.ts:

The dashboard is at apps/web/src/app/dashboard/page.tsx.

Tests to write:
1. Test page title is "Dashboard"
2. Test stats cards render (Total Bookings, Total Claims, Pending Claims)
3. Test "Add Booking" button is visible and clickable
4. Test "Recent Bookings" section shows empty state
5. Test "Recent Claims" section shows empty state
6. Screenshot: dashboard-empty-state.png

Note: Dashboard currently shows 0 for all stats (mock data).
```

**Verification**:
- [ ] Dashboard tests pass
- [ ] Empty state screenshot captured

### Prompt 1.5: Seat Map E2E Tests
```
Budget: $2.00

Create E2E tests for the seat map in apps/web/e2e/seatmap.spec.ts:

The seat map page is at apps/web/src/app/seatmap/page.tsx.
Components are in apps/web/src/components/seatmap/:
- SeatMap.tsx - main seat grid
- Seat.tsx - individual seat
- PreferenceForm.tsx - preference selection form

Tests to write:
1. Test page loads with e320 selected by default
2. Test coach selector shows 16 coaches
3. Test preference form renders all options
4. Test clicking a seat shows seat details
5. Test submitting preferences highlights recommended seats
6. Screenshot: seatmap-default.png
7. Screenshot: seatmap-with-selection.png
8. Screenshot: seatmap-recommendations.png (after form submit)
```

**Verification**:
- [ ] Seat map tests pass
- [ ] 3 screenshots captured

### Prompt 1.6: Queue Times E2E Tests
```
Budget: $2.00

Create E2E tests for queue times in apps/web/e2e/queue.spec.ts:

The queue page is at apps/web/src/app/queue/page.tsx.
Components are in apps/web/src/components/queue/:
- QueueStatus.tsx - current queue status card
- QueueTimeline.tsx - hourly prediction chart
- TerminalSelector.tsx - terminal dropdown
- ArrivalPlanner.tsx - optimal arrival calculator

Tests to write:
1. Test page loads with St Pancras selected
2. Test terminal selector has 4+ terminals
3. Test current queue status shows wait time
4. Test timeline chart renders bars
5. Test arrival planner form works
6. Screenshot: queue-st-pancras.png
7. Screenshot: queue-gare-du-nord.png (after changing terminal)
8. Screenshot: queue-arrival-planner.png (after planning)
```

**Verification**:
- [ ] Queue tests pass
- [ ] 3 screenshots captured

### Prompt 1.7: Bookings E2E Tests
```
Budget: $2.00

Create E2E tests for bookings in apps/web/e2e/bookings.spec.ts:

The bookings page is at apps/web/src/app/bookings/page.tsx.
The add booking dialog should be testable.

Tests to write:
1. Test page loads with empty state
2. Test "Add Booking" button opens dialog/form
3. Test form has required fields (PNR, train number, date, etc.)
4. Test form validation (invalid PNR format)
5. Test cancel closes dialog
6. Screenshot: bookings-empty.png
7. Screenshot: bookings-add-dialog.png
```

**Verification**:
- [ ] Bookings tests pass
- [ ] 2 screenshots captured

### Prompt 1.8: Test Runner Script
```
Budget: $2.00

Create a comprehensive test runner in the root package.json:

1. Add root-level scripts:
   - "test:e2e": "pnpm --filter=@eurostar/web e2e"
   - "test:e2e:ui": "pnpm --filter=@eurostar/web e2e:ui"
   - "test:e2e:screenshots": "pnpm --filter=@eurostar/web e2e e2e/visual-baseline.spec.ts"
   - "test:all": "pnpm test && pnpm test:e2e"

2. Create scripts/run-e2e.sh:
   - Starts dev server in background
   - Waits for server to be ready (curl localhost:3000)
   - Runs playwright tests
   - Kills dev server
   - Exits with test exit code

3. Make script executable: chmod +x scripts/run-e2e.sh

4. Update turbo.json to include e2e task if needed

Verify by running: ./scripts/run-e2e.sh
```

**Verification**:
- [ ] Root scripts added
- [ ] run-e2e.sh works end-to-end
- [ ] All E2E tests pass

### Phase 1 Checkpoint

**Manual verification required**:
1. Run `./scripts/run-e2e.sh`
2. Check all tests pass
3. Review screenshots in `apps/web/e2e/screenshots/`
4. Capture screenshot of terminal showing all tests passing

**Do not proceed to Phase 2 until**:
- [ ] All 8 prompts completed
- [ ] E2E test suite runs successfully
- [ ] Screenshots reviewed and acceptable

---

## Phase 2: Authentication & Security

**Goal**: Implement real JWT authentication with secure token handling.

### Prompt 2.1: Auth Schema & Types
```
Budget: $2.00

Add authentication database schema and types.

1. Update packages/core/src/db/schema.ts:
   - Add 'sessions' table: id, userId, token, expiresAt, createdAt, userAgent, ipAddress
   - Add 'password_hash' column to users table (nullable for now)
   - Add 'email_verified' boolean to users table
   - Add 'verification_token' to users table

2. Create packages/core/src/auth/types.ts:
   - AuthUser: id, email, name, emailVerified
   - Session: id, userId, expiresAt
   - TokenPayload: userId, sessionId, exp, iat
   - AuthResult: Result<AuthUser, AuthError>
   - AuthError: 'invalid_credentials' | 'expired_token' | 'invalid_token' | 'user_not_found'

3. Export from packages/core/src/index.ts

Run: pnpm db:generate && pnpm build
```

**Verification**:
- [ ] Migration generated
- [ ] Types exported from core

### Prompt 2.2: Password Hashing Service
```
Budget: $2.00

Create password hashing service in packages/core/src/auth/password.service.ts:

1. Install bcrypt: pnpm add bcrypt --filter=@eurostar/core
   And types: pnpm add -D @types/bcrypt --filter=@eurostar/core

2. Create password.service.ts:
   - hashPassword(password: string): Promise<string>
   - verifyPassword(password: string, hash: string): Promise<boolean>
   - Use bcrypt with cost factor 12

3. Create packages/core/src/auth/__tests__/password.service.test.ts:
   - Test hashing produces different hash each time
   - Test verification returns true for correct password
   - Test verification returns false for wrong password
   - Test empty password handling

Run: pnpm test --filter=@eurostar/core
```

**Verification**:
- [ ] Password tests pass
- [ ] bcrypt installed

### Prompt 2.3: JWT Token Service
```
Budget: $2.50

Create JWT token service in packages/core/src/auth/token.service.ts:

1. Install dependencies:
   pnpm add @fastify/jwt @fastify/cookie --filter=@eurostar/autoclaim
   pnpm add jsonwebtoken --filter=@eurostar/core
   pnpm add -D @types/jsonwebtoken --filter=@eurostar/core

2. Create token.service.ts:
   - generateAccessToken(payload: TokenPayload): string (15 min expiry)
   - generateRefreshToken(payload: TokenPayload): string (7 day expiry)
   - verifyToken(token: string): Result<TokenPayload, AuthError>
   - decodeToken(token: string): TokenPayload | null (no verification)
   - Use environment variable JWT_SECRET (with fallback for dev)
   - BEST PRACTICE: Consider RS256 algorithm for production (asymmetric)

3. Create packages/core/src/auth/__tests__/token.service.test.ts:
   - Test token generation
   - Test token verification (valid)
   - Test token verification (expired) - use short expiry for test
   - Test token verification (invalid signature)
   - Test token verification (malformed)

4. Cookie configuration constants (for use in API):
   - ACCESS_TOKEN_COOKIE: 'access_token' (httpOnly: false for SPA access)
   - REFRESH_TOKEN_COOKIE: 'refresh_token' (httpOnly: true, secure: true, sameSite: 'strict')

Run: pnpm test --filter=@eurostar/core
```

**Verification**:
- [ ] Token tests pass
- [ ] JWT dependency installed

### Prompt 2.4: Auth Repository
```
Budget: $2.50

Create auth repository in packages/core/src/auth/auth.repository.ts:

This connects to the database using Drizzle ORM.
Existing pattern in packages/core/src/db/schema.ts.

1. Create auth.repository.ts:
   - createUser(email, passwordHash, name): Promise<User>
   - findUserByEmail(email): Promise<User | null>
   - findUserById(id): Promise<User | null>
   - updatePassword(userId, passwordHash): Promise<void>
   - createSession(userId, token, expiresAt, userAgent?, ip?): Promise<Session>
   - findSessionByToken(token): Promise<Session | null>
   - deleteSession(sessionId): Promise<void>
   - deleteUserSessions(userId): Promise<void>

2. Create packages/core/src/auth/__tests__/auth.repository.test.ts:
   - Use in-memory SQLite or mock for tests
   - Test user creation
   - Test find by email
   - Test session creation and lookup
   - Test session deletion

Run: pnpm test --filter=@eurostar/core
```

**Verification**:
- [ ] Repository tests pass
- [ ] All CRUD operations work

### Prompt 2.5: Auth Service
```
Budget: $3.00

Create auth service in packages/core/src/auth/auth.service.ts:

This orchestrates the auth flow using the repository, password, and token services.

1. Create auth.service.ts:
   - register(email, password, name): Promise<Result<AuthUser, AuthError>>
     * Validate email format
     * Check if user exists
     * Hash password
     * Create user
     * Return user (without password)

   - login(email, password, userAgent?, ip?): Promise<Result<{user, accessToken, refreshToken}, AuthError>>
     * Find user by email
     * Verify password
     * Create session in DB
     * Generate tokens
     * Return tokens and user

   - logout(sessionId, accessToken): Promise<void>
     * Delete session from DB
     * IMPORTANT: Add access token to Redis blacklist (key: `blacklist:${tokenId}`, TTL: token remaining lifetime)
     * This prevents the access token from being used even though it hasn't expired

   - refreshTokens(refreshToken): Promise<Result<{accessToken, refreshToken}, AuthError>>
     * Verify refresh token
     * Check token not in blacklist
     * Find session
     * Check not expired
     * Generate NEW refresh token (rotation pattern)
     * Blacklist old refresh token
     * Update session with new refresh token
     * Return new tokens

   - validateAccessToken(token): Promise<Result<AuthUser, AuthError>>
     * Check token not in Redis blacklist
     * Verify token signature and expiry
     * Find user
     * Return user

2. Create comprehensive tests in auth.service.test.ts

Run: pnpm test --filter=@eurostar/core
```

**Verification**:
- [ ] Auth service tests pass
- [ ] All auth flows covered

### Prompt 2.6: Auth API Routes
```
Budget: $3.00

Add authentication routes to the Fastify API.

Location: packages/autoclaim/src/api/
Existing app setup: packages/autoclaim/src/api/app.ts

1. Create handlers/auth.handler.ts:
   - POST /api/v1/auth/register - body: {email, password, name}
   - POST /api/v1/auth/login - body: {email, password}
   - POST /api/v1/auth/logout - requires auth header
   - POST /api/v1/auth/refresh - body: {refreshToken}
   - GET /api/v1/auth/me - requires auth header, returns current user

2. Create schemas/auth.schema.ts with TypeBox:
   - RegisterBody, LoginBody, RefreshBody
   - AuthResponse, UserResponse

3. Create middleware/auth.middleware.ts:
   - authenticate(request, reply) - extracts and validates JWT from Authorization header
   - Attaches user to request.user

4. Register routes in app.ts (auth routes are public, don't require existing auth)

5. Update existing protected routes to use auth middleware

Run: pnpm build && pnpm test --filter=@eurostar/autoclaim
```

**Verification**:
- [ ] Auth routes registered
- [ ] Middleware created
- [ ] Tests pass

### Prompt 2.7: Auth E2E Tests
```
Budget: $2.00

Create E2E tests for authentication in apps/web/e2e/auth.spec.ts:

Note: The frontend auth UI doesn't exist yet. These tests will initially fail
and serve as acceptance criteria for the frontend work.

Tests to write:
1. Test: Unauthenticated user sees login page (or redirect)
2. Test: Login form renders with email/password fields
3. Test: Invalid credentials show error message
4. Test: Successful login redirects to dashboard
5. Test: Logout button visible when authenticated
6. Test: Logout clears session and redirects to login

Mark tests as test.skip() for now - will enable after frontend auth.
```

**Verification**:
- [ ] Auth E2E test file created
- [ ] Tests are skipped but defined

### Prompt 2.8: Login Page UI
```
Budget: $2.50

Create login page in apps/web:

1. Create apps/web/src/app/login/page.tsx:
   - Centered card layout
   - Email input with validation
   - Password input with show/hide toggle
   - "Remember me" checkbox
   - Submit button with loading state
   - Link to register page
   - Error message display area

2. Use existing shadcn components:
   - Card, CardHeader, CardContent
   - Input, Label
   - Button
   - Form components if available, else basic form

3. Create apps/web/src/app/login/actions.ts:
   - Server action for login (calls API)
   - Handles setting cookies for tokens

4. Style to match existing app theme

Run: pnpm build --filter=@eurostar/web
Screenshot: login-page.png
```

**Verification**:
- [ ] Login page renders
- [ ] Screenshot captured
- [ ] Matches app theme

### Prompt 2.9: Register Page UI
```
Budget: $2.00

Create register page in apps/web:

1. Create apps/web/src/app/register/page.tsx:
   - Similar layout to login
   - Name input
   - Email input with validation
   - Password input with strength indicator
   - Confirm password input
   - Terms acceptance checkbox
   - Submit button with loading state
   - Link to login page

2. Create apps/web/src/app/register/actions.ts:
   - Server action for registration
   - Redirect to login on success

Run: pnpm build --filter=@eurostar/web
Screenshot: register-page.png
```

**Verification**:
- [ ] Register page renders
- [ ] Screenshot captured

### Prompt 2.10: Auth Context & Protected Routes
```
Budget: $3.00

Create auth context and route protection in apps/web:

1. Create apps/web/src/contexts/AuthContext.tsx:
   - AuthProvider component
   - useAuth() hook returning: user, isLoading, isAuthenticated, login, logout, register
   - Store tokens in httpOnly cookies (via server actions)
   - Refresh tokens automatically when expired

2. Create apps/web/src/components/auth/ProtectedRoute.tsx:
   - Wrapper component that redirects to /login if not authenticated
   - Shows loading spinner while checking auth

3. Update apps/web/src/app/layout.tsx:
   - Wrap with AuthProvider

4. Update apps/web/src/app/(protected)/layout.tsx:
   - Create route group for protected pages
   - Move dashboard, bookings, claims, seatmap, queue under (protected)
   - Apply ProtectedRoute wrapper

5. Update Header.tsx to show:
   - User name/avatar when logged in
   - Logout button
   - Login button when not authenticated

Run: pnpm build --filter=@eurostar/web
Enable and run auth E2E tests: pnpm test:e2e
```

**Verification**:
- [ ] Auth context works
- [ ] Protected routes redirect when not logged in
- [ ] Auth E2E tests pass
- [ ] Screenshot: header-authenticated.png
- [ ] Screenshot: header-unauthenticated.png

### Phase 2 Checkpoint

**Manual verification required**:
1. Start dev server: `pnpm dev`
2. Navigate to http://localhost:3000
3. Verify redirect to /login
4. Register a new account
5. Login with credentials
6. Verify dashboard loads
7. Verify header shows user info
8. Click logout
9. Verify redirect to login

**Screenshots to review**:
- [ ] login-page.png
- [ ] register-page.png
- [ ] header-authenticated.png
- [ ] header-unauthenticated.png

**Do not proceed to Phase 3 until**:
- [ ] All auth tests pass (unit + E2E)
- [ ] Manual flow verification complete
- [ ] Security review: no tokens in localStorage, httpOnly cookies

---

## Phase 3: UI Polish - AutoClaim

**Goal**: Polish the AutoClaim (Dashboard, Bookings, Claims) UI to production quality.

### Prompt 3.1: Design Tokens & Theme
```
Budget: $2.00

Establish design tokens in apps/web:

1. Update apps/web/src/app/globals.css:
   - Define CSS custom properties for:
     * --color-success: green shades for positive states
     * --color-warning: amber for warnings
     * --color-error: red for errors
     * --color-info: blue for information
     * --spacing-page: consistent page padding
     * --radius-card: card border radius

2. Create apps/web/src/lib/theme.ts:
   - Export delayColors: { onTime, minor, moderate, severe }
   - Export claimStatusColors: { pending, approved, rejected, submitted }
   - Export animationDurations: { fast, normal, slow }

3. Document in a comment block at top of globals.css

Run: pnpm build --filter=@eurostar/web
```

**Verification**:
- [ ] CSS variables defined
- [ ] Theme constants exported

### Prompt 3.2: Loading Skeletons
```
Budget: $2.00

Create consistent loading skeletons:

1. Create apps/web/src/components/ui/skeleton-card.tsx:
   - SkeletonCard: Card-shaped loading skeleton
   - SkeletonStat: Small stat card skeleton (for dashboard stats)
   - SkeletonTable: Table loading skeleton with rows
   - SkeletonList: List loading skeleton

2. Use shadcn Skeleton primitive as base

3. Add subtle pulse animation

4. Update dashboard to use SkeletonStat while loading

Run: pnpm build --filter=@eurostar/web
Screenshot: dashboard-loading-state.png
```

**Verification**:
- [ ] Skeleton components created
- [ ] Dashboard shows loading state
- [ ] Screenshot captured

### Prompt 3.3: Empty States
```
Budget: $2.00

Create consistent empty state components:

1. Create apps/web/src/components/ui/empty-state.tsx:
   - Props: icon, title, description, action (button)
   - Centered layout with illustration
   - Subtle background pattern or icon

2. Update these pages to use EmptyState:
   - Dashboard "No bookings yet" section
   - Dashboard "No claims yet" section
   - Bookings page empty state
   - Claims page empty state

3. Each empty state should have:
   - Relevant icon (Ticket for bookings, FileText for claims)
   - Helpful description
   - Clear CTA button

Run: pnpm build --filter=@eurostar/web
Screenshot: bookings-empty-polished.png
Screenshot: claims-empty-polished.png
```

**Verification**:
- [ ] Empty states consistent
- [ ] Screenshots show polished design

### Prompt 3.4: Dashboard Stats Cards
```
Budget: $2.00

Polish the dashboard stats cards:

Location: apps/web/src/app/dashboard/page.tsx

1. Enhance stat cards:
   - Add trend indicator (up/down arrow with percentage)
   - Add subtle icon background
   - Add hover effect (slight elevation)
   - Color-code based on meaning:
     * Pending Claims: amber if > 0
     * Total Claims: neutral
     * Total Bookings: neutral

2. Make cards clickable - navigate to respective pages

3. Add tooltips explaining each stat

Run: pnpm build --filter=@eurostar/web
Screenshot: dashboard-stats-polished.png
```

**Verification**:
- [ ] Stats cards enhanced
- [ ] Hover effects work
- [ ] Click navigation works

### Prompt 3.5: Bookings Table
```
Budget: $2.50

Polish the bookings table/list:

Location: apps/web/src/app/bookings/page.tsx

1. Create apps/web/src/components/bookings/BookingTable.tsx:
   - Columns: Train, Route, Date, Status, Actions
   - Status badges with colors:
     * Monitoring: blue
     * Delayed: amber
     * Eligible: green
     * Claimed: purple
   - Row hover effect
   - Sortable columns (click header)
   - Responsive: table on desktop, cards on mobile

2. Create apps/web/src/components/bookings/BookingCard.tsx:
   - Mobile-friendly card layout
   - Same information as table row
   - Swipe actions (optional)

3. Add pagination if > 10 items

Run: pnpm build --filter=@eurostar/web
Screenshot: bookings-table-desktop.png
Screenshot: bookings-cards-mobile.png (375px viewport)
```

**Verification**:
- [ ] Table renders correctly
- [ ] Mobile cards work
- [ ] Sorting works
- [ ] Screenshots captured

### Prompt 3.6: Add Booking Dialog
```
Budget: $2.50

Polish the add booking dialog:

1. Create apps/web/src/components/bookings/AddBookingDialog.tsx:
   - Use shadcn Dialog component
   - Form fields:
     * PNR (6 chars, uppercase, with format hint)
     * TCN (starts with IV or 15, with format mask)
     * Train Number (4 digits)
     * Journey Date (date picker)
     * Departure Station (searchable select)
     * Arrival Station (searchable select)
   - Inline validation with helpful error messages
   - Loading state on submit
   - Success toast on completion
   - Auto-close on success

2. Use react-hook-form for form handling

3. Animate dialog open/close

Run: pnpm build --filter=@eurostar/web
Screenshot: add-booking-dialog.png
Screenshot: add-booking-validation.png (with errors)
```

**Verification**:
- [ ] Dialog renders
- [ ] Validation works
- [ ] Screenshots show both states

### Prompt 3.7: Claims Table
```
Budget: $2.00

Polish the claims table/list:

Location: apps/web/src/app/claims/page.tsx

1. Create apps/web/src/components/claims/ClaimTable.tsx:
   - Columns: Booking, Delay, Compensation, Status, Actions
   - Status badges:
     * Pending: amber
     * Ready to Submit: blue
     * Submitted: purple
     * Approved: green
     * Rejected: red
   - Compensation amount with currency
   - "View Details" action
   - "Submit Claim" action for ready claims

2. Create apps/web/src/components/claims/ClaimCard.tsx:
   - Mobile card layout

3. Add filters: status dropdown, date range

Run: pnpm build --filter=@eurostar/web
Screenshot: claims-table-desktop.png
Screenshot: claims-with-filters.png
```

**Verification**:
- [ ] Claims table renders
- [ ] Filters work
- [ ] Screenshots captured

### Prompt 3.8: Claim Details Page
```
Budget: $2.50

Create/polish the claim details page:

Location: apps/web/src/app/claims/[id]/page.tsx

1. Header section:
   - Claim status badge (large)
   - Booking reference
   - Creation date

2. Journey details card:
   - Train number and route
   - Scheduled vs actual times
   - Delay duration (highlighted)

3. Compensation breakdown card:
   - Ticket price
   - Compensation percentage
   - Compensation amount (large, highlighted)
   - Cash vs voucher option selector

4. Pre-filled form preview card:
   - Show what will be submitted
   - All passenger details
   - "Copy to Clipboard" for each field
   - "Open Eurostar Claim Form" button (external link)

5. Timeline/history section:
   - When booking was added
   - When delay was detected
   - When claim became eligible

Run: pnpm build --filter=@eurostar/web
Screenshot: claim-details-page.png
```

**Verification**:
- [ ] Details page renders
- [ ] All sections present
- [ ] Screenshot captured

### Prompt 3.9: Toast Notifications
```
Budget: $2.00

Implement consistent toast notifications:

1. Ensure apps/web/src/components/ui/toaster.tsx exists and is in layout

2. Create apps/web/src/lib/notifications.ts:
   - showSuccess(title, description?)
   - showError(title, description?)
   - showWarning(title, description?)
   - showInfo(title, description?)
   - showLoading(title) - returns dismiss function

3. Add toasts to all user actions:
   - Booking added successfully
   - Booking deleted
   - Claim submitted
   - Login successful
   - Logout successful
   - Error states

4. Style toasts:
   - Icon for each type
   - Consistent positioning (top-right)
   - Auto-dismiss after 5s (configurable)
   - Manual dismiss button

Run: pnpm build --filter=@eurostar/web
```

**Verification**:
- [ ] Toast helper functions work
- [ ] Toasts appear on user actions

### Prompt 3.10: Form Validation UX
```
Budget: $2.00

Improve form validation UX across all forms:

1. Create apps/web/src/components/ui/form-field.tsx:
   - Wrapper component for form fields
   - Shows label, input, error message, helper text
   - Error state styling (red border, icon)
   - Success state styling (green checkmark)
   - Animated error message appearance

2. Update AddBookingDialog to use FormField

3. Update login/register forms to use FormField

4. Add these validation patterns:
   - Validate on blur (not on every keystroke)
   - Show errors only after field touched
   - Clear error when user starts fixing
   - Disable submit until form valid

Run: pnpm build --filter=@eurostar/web
Screenshot: form-validation-errors.png
Screenshot: form-validation-success.png
```

**Verification**:
- [ ] FormField component works
- [ ] Validation UX smooth
- [ ] Screenshots captured

### Prompt 3.11: Responsive Polish
```
Budget: $2.00

Ensure all AutoClaim pages are fully responsive:

1. Test and fix at these breakpoints:
   - Mobile: 375px
   - Tablet: 768px
   - Desktop: 1024px+

2. Specific fixes:
   - Dashboard: Stack stat cards on mobile
   - Bookings: Switch table to cards on mobile
   - Claims: Switch table to cards on mobile
   - Claim details: Single column on mobile
   - Forms: Full width inputs on mobile

3. Check touch targets are 44px minimum on mobile

4. Test header navigation collapses to hamburger menu

Run: pnpm build --filter=@eurostar/web
Screenshot: dashboard-mobile.png (375px)
Screenshot: dashboard-tablet.png (768px)
Screenshot: bookings-mobile.png (375px)
```

**Verification**:
- [ ] All breakpoints tested
- [ ] Touch targets adequate
- [ ] Screenshots captured

### Prompt 3.12: AutoClaim E2E Visual Tests
```
Budget: $2.00

Update E2E tests with visual regression:

1. Update apps/web/e2e/dashboard.spec.ts:
   - Add screenshot comparisons
   - Test loading states
   - Test responsive layouts

2. Update apps/web/e2e/bookings.spec.ts:
   - Screenshot empty state
   - Screenshot add dialog
   - Screenshot validation errors

3. Update apps/web/e2e/claims.spec.ts (create if doesn't exist):
   - Screenshot claims list
   - Screenshot claim details
   - Screenshot filters

4. All screenshots should be captured at:
   - Desktop (1280x720)
   - Mobile (375x667)

Run: pnpm test:e2e --filter=@eurostar/web
Review all screenshots in e2e/screenshots/
```

**Verification**:
- [ ] All E2E tests pass
- [ ] Screenshots captured at both sizes
- [ ] Visual review complete

### Phase 3 Checkpoint

**Manual verification required**:
1. Run full E2E suite
2. Review ALL screenshots from this phase
3. Test manually on real mobile device if possible
4. Check accessibility (tab navigation, screen reader basics)

**Screenshots to review**:
- [ ] dashboard-loading-state.png
- [ ] bookings-empty-polished.png
- [ ] claims-empty-polished.png
- [ ] dashboard-stats-polished.png
- [ ] bookings-table-desktop.png
- [ ] bookings-cards-mobile.png
- [ ] add-booking-dialog.png
- [ ] add-booking-validation.png
- [ ] claims-table-desktop.png
- [ ] claim-details-page.png
- [ ] form-validation-*.png
- [ ] *-mobile.png variants

**Do not proceed to Phase 4 until**:
- [ ] All screenshots reviewed and acceptable
- [ ] E2E tests pass
- [ ] No major UI issues on mobile

---

## Phase 4: UI Polish - SeatMap

**Goal**: Polish the seat map visualization to be intuitive and informative.

### Prompt 4.1: Seat Component Redesign
```
Budget: $2.00

Redesign the individual seat component:

Location: apps/web/src/components/seatmap/Seat.tsx

1. Visual improvements:
   - Rounded rectangle shape (like actual train seat)
   - Clear seat number inside
   - Color gradient based on score (green=best, yellow=ok, red=avoid)
   - Subtle shadow for depth
   - Hover state: slight scale + tooltip
   - Selected state: ring + checkmark

2. Add feature icons:
   - Window seat: small window icon in corner
   - Power outlet: plug icon
   - Table: table icon
   - Quiet zone: "shh" or quiet icon

3. Warning indicators:
   - No window: strikethrough on window icon
   - Near toilet: water drop icon
   - Limited recline: back-arrow icon

Run: pnpm build --filter=@eurostar/web
Screenshot: seat-component-states.png (showing all states)
```

**Verification**:
- [ ] Seat component redesigned
- [ ] All states visible in screenshot

### Prompt 4.2: Coach Layout Visualization
```
Budget: $2.50

Improve the coach layout in SeatMap.tsx:

Location: apps/web/src/components/seatmap/SeatMap.tsx

1. Layout improvements:
   - Show aisle clearly (gap between seat pairs)
   - Add row numbers on the side
   - Show coach number prominently
   - Add direction indicator (arrow showing travel direction)
   - Show class badge (Business Premier, Standard, etc.)

2. Coach container:
   - Rounded ends like actual train coach
   - Different background color per class
   - Zoom in/out controls

3. Legend:
   - Clear legend showing what each color means
   - Feature icon legend
   - Warning icon legend

Run: pnpm build --filter=@eurostar/web
Screenshot: coach-layout-business.png (Business Premier coach)
Screenshot: coach-layout-standard.png (Standard coach)
```

**Verification**:
- [ ] Coach layout improved
- [ ] Aisle clearly visible
- [ ] Screenshots captured

### Prompt 4.3: Train Overview
```
Budget: $2.00

Create a train overview component:

1. Create apps/web/src/components/seatmap/TrainOverview.tsx:
   - Shows all 16 coaches in a row (miniature)
   - Each coach is clickable to zoom into it
   - Color-coded by class
   - Shows current coach highlighted
   - Arrow indicators for front/back of train

2. Position at top of seat map page

3. Click behavior:
   - Click coach to focus on it
   - Show tooltip with coach info on hover

Run: pnpm build --filter=@eurostar/web
Screenshot: train-overview.png
```

**Verification**:
- [ ] Overview component created
- [ ] Navigation works
- [ ] Screenshot captured

### Prompt 4.4: Preference Form Redesign
```
Budget: $2.00

Polish the preference form:

Location: apps/web/src/components/seatmap/PreferenceForm.tsx

1. Form redesign:
   - Group related options (Preferences, Avoid, Travel Party)
   - Use toggle switches instead of checkboxes
   - Visual icons next to each option
   - "Party size" as a stepper (1-4) with +/- buttons
   - Facing preference as visual radio buttons (chair icons)

2. Add presets:
   - "Business Traveler" preset (window, quiet, power)
   - "Family" preset (table, together, no quiet)
   - "Quick trip" preset (aisle, near exit)

3. "Find seats" button:
   - Primary color
   - Loading state with spinner
   - Show count of matches found

Run: pnpm build --filter=@eurostar/web
Screenshot: preference-form-polished.png
```

**Verification**:
- [ ] Form redesigned
- [ ] Presets work
- [ ] Screenshot captured

### Prompt 4.5: Seat Details Panel
```
Budget: $2.00

Create a seat details panel:

1. Create apps/web/src/components/seatmap/SeatDetails.tsx:
   - Slide-in panel from right (or bottom on mobile)
   - Shows selected seat info:
     * Large seat number
     * Coach and class
     * All features with icons and descriptions
     * All warnings with explanations
     * Score breakdown (why this score?)
   - "Select this seat" button
   - "Compare" button to add to comparison

2. Show when user clicks a seat

3. Animate panel open/close

Run: pnpm build --filter=@eurostar/web
Screenshot: seat-details-panel.png
```

**Verification**:
- [ ] Details panel works
- [ ] Animation smooth
- [ ] Screenshot captured

### Prompt 4.6: Seat Comparison
```
Budget: $2.00

Add seat comparison feature:

1. Create apps/web/src/components/seatmap/SeatComparison.tsx:
   - Compare up to 3 seats side by side
   - Show features/warnings in a comparison table
   - Highlight differences
   - Clear winner indication

2. Add "Compare" mode:
   - Toggle to enable comparison mode
   - Click seats to add to comparison
   - Floating comparison bar at bottom
   - "Clear comparison" button

Run: pnpm build --filter=@eurostar/web
Screenshot: seat-comparison.png
```

**Verification**:
- [ ] Comparison works
- [ ] Clear UI for compare mode
- [ ] Screenshot captured

### Prompt 4.7: Recommendation Results
```
Budget: $2.00

Polish how recommendations are shown:

1. Update recommendation display:
   - Recommended seats pulse/glow animation
   - Rank badge (#1, #2, #3) on top seats
   - "Best match" badge on #1
   - Smooth scroll to recommended section

2. Results summary:
   - "Found X seats matching your preferences"
   - Show why top pick is best
   - "Show all" / "Show top 5" toggle

3. If no matches:
   - Helpful message
   - Suggest relaxing preferences
   - Quick buttons to adjust filters

Run: pnpm build --filter=@eurostar/web
Screenshot: recommendations-display.png
Screenshot: recommendations-none.png (no matches)
```

**Verification**:
- [ ] Recommendations visible
- [ ] Empty state handled
- [ ] Screenshots captured

### Prompt 4.8: Mobile Seat Map
```
Budget: $2.00

Optimize seat map for mobile:

1. Mobile layout (< 768px):
   - Single coach view (no multi-coach overview)
   - Coach selector as horizontal scrollable tabs
   - Larger touch targets for seats
   - Bottom sheet for seat details (instead of side panel)
   - Preference form as collapsible accordion

2. Gestures:
   - Pinch to zoom on coach
   - Swipe to change coach
   - Long press for seat details

3. Performance:
   - Only render visible coach
   - Lazy load other coaches

Run: pnpm build --filter=@eurostar/web
Screenshot: seatmap-mobile.png (375px)
Screenshot: seatmap-mobile-details.png (with bottom sheet)
```

**Verification**:
- [ ] Mobile layout works
- [ ] Touch interactions smooth
- [ ] Screenshots captured

### Prompt 4.9: Seat Map Accessibility
```
Budget: $2.00

Improve seat map accessibility:

1. Keyboard navigation:
   - Arrow keys to move between seats
   - Enter to select seat
   - Escape to close details
   - Tab through form fields

2. Screen reader:
   - ARIA labels on seats: "Seat 42A, Window, Business Premier, Score: Good"
   - ARIA live region for recommendation updates
   - Form labels properly associated

3. Visual accessibility:
   - Ensure color contrast meets WCAG AA
   - Don't rely only on color - add patterns/icons
   - Focus indicators visible

Run: pnpm build --filter=@eurostar/web
```

**Verification**:
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Contrast meets standards

### Prompt 4.10: Seat Map E2E Tests
```
Budget: $2.00

Comprehensive E2E tests for seat map:

Update apps/web/e2e/seatmap.spec.ts:

1. Navigation tests:
   - Navigate to seat map
   - Change coach
   - Use train overview to navigate

2. Interaction tests:
   - Click seat to see details
   - Submit preferences
   - View recommendations
   - Compare seats

3. Visual tests (screenshots):
   - Default view
   - With seat selected
   - With recommendations shown
   - Mobile view
   - Comparison view

4. Accessibility tests:
   - Tab through interface
   - Verify ARIA labels present

Run: pnpm test:e2e --filter=@eurostar/web
```

**Verification**:
- [ ] All seat map E2E tests pass
- [ ] Screenshots captured

### Phase 4 Checkpoint

**Screenshots to review**:
- [ ] seat-component-states.png
- [ ] coach-layout-*.png
- [ ] train-overview.png
- [ ] preference-form-polished.png
- [ ] seat-details-panel.png
- [ ] seat-comparison.png
- [ ] recommendations-*.png
- [ ] seatmap-mobile-*.png

**Manual testing**:
1. Test seat selection flow end-to-end
2. Test recommendation accuracy
3. Test on real mobile device
4. Test with keyboard only
5. Run accessibility audit (Lighthouse)

---

## Phase 5: UI Polish - EuroQueue

**Goal**: Create an intuitive queue time dashboard with clear visualizations.

### Prompt 5.1: Queue Status Card Redesign
```
Budget: $2.00

Redesign the queue status card:

Location: apps/web/src/components/queue/QueueStatus.tsx

1. Visual improvements:
   - Large, prominent wait time number
   - Color-coded background (green=low, amber=moderate, red=high)
   - Animated ring/gauge around the number
   - Crowd level text below (e.g., "Moderate - Expect some queuing")
   - Confidence indicator (badge or dots)

2. Add context:
   - "As of [time]" timestamp
   - "Updates every 5 minutes" text
   - Trend arrow (if available): "Getting busier" / "Clearing up"

3. Responsive:
   - Full width on mobile
   - Card layout on desktop

Run: pnpm build --filter=@eurostar/web
Screenshot: queue-status-low.png
Screenshot: queue-status-high.png
```

**Verification**:
- [ ] Status card redesigned
- [ ] Color coding works
- [ ] Screenshots captured

### Prompt 5.2: Timeline Chart Redesign
```
Budget: $2.50

Redesign the queue timeline chart:

Location: apps/web/src/components/queue/QueueTimeline.tsx

1. Chart improvements:
   - Use a proper charting library (recharts is common in Next.js)
   - Smooth area chart instead of bars
   - Color gradient fill (green to red based on crowd level)
   - Current time indicator (vertical line)
   - Hover to see exact value
   - Touch-friendly on mobile

2. Time axis:
   - Show full 24-hour timeline
   - Highlight "now" prominently
   - Mark peak hours with shading
   - Show terminal operating hours

3. Y-axis:
   - Wait time in minutes
   - Grid lines at 15, 30, 45, 60 min
   - Color zones (green/amber/red regions)

4. Add view options:
   - Today
   - Tomorrow
   - Custom date picker

Run: pnpm build --filter=@eurostar/web
Screenshot: queue-timeline-chart.png
```

**Verification**:
- [ ] Chart library integrated
- [ ] Smooth visualization
- [ ] Screenshot captured

### Prompt 5.3: Terminal Selector Redesign
```
Budget: $2.00

Redesign the terminal selector:

Location: apps/web/src/components/queue/TerminalSelector.tsx

1. Visual improvements:
   - Card-based selector (not dropdown)
   - Show terminal image/icon
   - Show current wait time on each card
   - Selected state with border/highlight

2. Information per terminal:
   - Terminal name
   - City
   - Current crowd level (colored dot)
   - Quick wait time preview

3. Layout:
   - Horizontal scroll on mobile
   - Grid on desktop

Run: pnpm build --filter=@eurostar/web
Screenshot: terminal-selector.png
```

**Verification**:
- [ ] Selector redesigned
- [ ] Screenshot captured

### Prompt 5.4: Arrival Planner Redesign
```
Budget: $2.00

Redesign the arrival planner:

Location: apps/web/src/components/queue/ArrivalPlanner.tsx

1. Form improvements:
   - Date picker for travel date
   - Time picker for departure time
   - Slider for "max acceptable wait" (5-60 min)
   - "Calculate" button with loading state

2. Results display:
   - Large recommended arrival time
   - Expected wait at that time
   - Visual timeline showing:
     * Recommended arrival
     * Expected queue time
     * Check-in close time
     * Departure time
   - Alternative times (earlier/later options)

3. Add "Add to calendar" button:
   - Google Calendar link
   - Apple Calendar (.ics) download

Run: pnpm build --filter=@eurostar/web
Screenshot: arrival-planner-form.png
Screenshot: arrival-planner-result.png
```

**Verification**:
- [ ] Planner form works
- [ ] Result visualization clear
- [ ] Screenshots captured

### Prompt 5.5: Peak Hours Visualization
```
Budget: $2.00

Add peak hours visualization:

1. Create apps/web/src/components/queue/PeakHours.tsx:
   - Show typical peak hours for selected terminal
   - Heatmap style: days of week vs hours
   - Color intensity = crowd level
   - "Best times to travel" recommendations
   - "Avoid these times" warnings

2. Add to queue page as an expandable section

3. Make it educational:
   - "Why is Friday evening busy?"
   - Tips for avoiding crowds

Run: pnpm build --filter=@eurostar/web
Screenshot: peak-hours-heatmap.png
```

**Verification**:
- [ ] Heatmap visualization works
- [ ] Screenshot captured

### Prompt 5.6: Real-Time Updates Indicator
```
Budget: $2.00

Add real-time update indicators:

1. Create apps/web/src/components/queue/UpdateIndicator.tsx:
   - Pulsing dot indicating live data
   - "Last updated: X seconds ago"
   - Auto-refresh countdown
   - Manual refresh button

2. Implement auto-refresh:
   - Poll API every 5 minutes
   - Update UI without full page reload
   - Show subtle animation when data updates
   - Toast notification for significant changes

3. Handle stale data:
   - If data > 10 min old, show warning
   - "Connection lost" state

Run: pnpm build --filter=@eurostar/web
Screenshot: update-indicator-live.png
Screenshot: update-indicator-stale.png
```

**Verification**:
- [ ] Auto-refresh works
- [ ] Stale data handled
- [ ] Screenshots captured

### Prompt 5.7: Mobile Queue Dashboard
```
Budget: $2.00

Optimize queue dashboard for mobile:

1. Mobile layout (< 768px):
   - Terminal selector as horizontal scroll cards
   - Current status as full-width hero card
   - Timeline as horizontal scrollable
   - Arrival planner in expandable accordion

2. Touch interactions:
   - Swipe between terminals
   - Pull to refresh
   - Tap timeline to see details

3. Condensed view:
   - Show most important info first
   - Collapse secondary info

Run: pnpm build --filter=@eurostar/web
Screenshot: queue-mobile-full.png
Screenshot: queue-mobile-planner.png
```

**Verification**:
- [ ] Mobile layout works
- [ ] Touch interactions smooth
- [ ] Screenshots captured

### Prompt 5.8: Queue E2E Tests
```
Budget: $2.00

Comprehensive E2E tests for queue times:

Update apps/web/e2e/queue.spec.ts:

1. Navigation tests:
   - Navigate to queue times
   - Change terminal

2. Interaction tests:
   - View current status
   - Check timeline chart renders
   - Use arrival planner
   - View peak hours

3. Visual tests:
   - Default view per terminal
   - Planner results
   - Mobile views

4. Auto-refresh tests:
   - Verify update indicator
   - Mock time passing

Run: pnpm test:e2e --filter=@eurostar/web
```

**Verification**:
- [ ] All queue E2E tests pass
- [ ] Screenshots captured

### Phase 5 Checkpoint

**Screenshots to review**:
- [ ] queue-status-*.png
- [ ] queue-timeline-chart.png
- [ ] terminal-selector.png
- [ ] arrival-planner-*.png
- [ ] peak-hours-heatmap.png
- [ ] update-indicator-*.png
- [ ] queue-mobile-*.png

---

## Phase 6: Feature Completion

**Goal**: Complete missing features and fill gaps.

### Prompt 6.1: E300 Train Type
```
Budget: $2.50

Add e300 (Alstom) train type to seatmap:

1. Create packages/seatmap/src/data/e300.ts:
   - 18 coaches (vs e320's 16)
   - ~750 total seats
   - Different coach layout:
     * Coach 1-2: Business Premier
     * Coach 3-4: Standard Premier
     * Coach 5-18: Standard
   - Slightly different seat numbering

2. Create packages/seatmap/src/data/e300-seats.ts:
   - Generate seat data following e320 pattern
   - Different problem seats (research or estimate)
   - Same feature types

3. Update getSeatInfo and related functions to handle e300

4. Add tests for e300 data

5. Update frontend train type selector

Run: pnpm test && pnpm build
```

**Verification**:
- [ ] E300 data created
- [ ] Tests pass
- [ ] UI shows e300 option

### Prompt 6.2: Classic/Ruby Train Types
```
Budget: $2.00

Add classic (e300/Class 373) and ruby train types:

1. Create packages/seatmap/src/data/classic.ts:
   - Classic Eurostar (older trains, being phased out)
   - ~750 seats, 18 coaches
   - Simpler layout

2. Create packages/seatmap/src/data/ruby.ts:
   - Ruby trains (London-Amsterdam direct)
   - Similar to e320 but different configuration

3. Create minimal seat data (can be less detailed):
   - Basic coach/seat structure
   - Known issues if any
   - Mark as "limited data available"

4. Update type definitions and exports

Run: pnpm test && pnpm build
```

**Verification**:
- [ ] Both train types added
- [ ] UI shows all 4 options

### Prompt 6.3: User Preferences Storage
```
Budget: $2.50

Add user preference persistence:

1. Create packages/core/src/db/schema.ts additions:
   - user_preferences table:
     * userId (FK)
     * seatPreferences (JSON)
     * queueNotifications (boolean)
     * defaultTerminal
     * preferredCompensationType ('cash' | 'voucher')

2. Create packages/core/src/preferences/preferences.repository.ts

3. Create packages/core/src/preferences/preferences.service.ts

4. Add API endpoints:
   - GET /api/v1/user/preferences
   - PATCH /api/v1/user/preferences

5. Update frontend:
   - Load saved preferences on seat map page
   - "Save as default" button on preference form
   - Settings page for managing preferences

Run: pnpm test && pnpm build
```

**Verification**:
- [ ] Preferences persist
- [ ] Settings page works

### Prompt 6.4: Booking Import (Email Parser Integration)
```
Budget: $2.50

Connect email parser to booking creation:

The email parser exists at packages/autoclaim/src/email-parser/

1. Add email import flow:
   - "Import from email" button on add booking
   - Paste email content textarea
   - Parse and pre-fill form fields
   - Show confidence for each parsed field
   - User confirms and submits

2. Update frontend:
   - Create ImportBookingDialog.tsx
   - Two tabs: "Manual entry" / "Import from email"
   - Syntax highlighting for email content
   - Error handling for unparseable emails

Run: pnpm build --filter=@eurostar/web
Screenshot: import-booking-dialog.png
```

**Verification**:
- [ ] Import flow works
- [ ] Parser integration complete
- [ ] Screenshot captured

### Prompt 6.5: Delay Notifications Setup
```
Budget: $2.50

Add notification preferences and setup:

1. Create notification settings UI:
   - apps/web/src/app/settings/notifications/page.tsx
   - Enable/disable delay alerts
   - Email notification preferences
   - Push notification preferences (future)
   - Notification thresholds (notify when delay > X minutes)

2. Update user preferences schema:
   - notifyOnDelay: boolean
   - delayThresholdMinutes: number
   - notifyViaEmail: boolean
   - notifyViaPush: boolean

3. Add settings page to navigation:
   - Settings icon in header
   - Link to /settings

Run: pnpm build --filter=@eurostar/web
Screenshot: notification-settings.png
```

**Verification**:
- [ ] Settings page works
- [ ] Preferences save
- [ ] Screenshot captured

### Prompt 6.6: Station Autocomplete
```
Budget: $2.00

Add station autocomplete for booking forms:

1. Create packages/core/src/stations/stations.ts:
   - List of all Eurostar stations
   - Station data: code, name, city, country
   - Aliases (e.g., "St Pancras" = "London St Pancras International")

2. Create apps/web/src/components/ui/station-select.tsx:
   - Combobox/autocomplete component
   - Search by name, code, or city
   - Show station with city context
   - Recent stations at top

3. Use in AddBookingDialog and ImportBookingDialog

Run: pnpm build --filter=@eurostar/web
Screenshot: station-autocomplete.png
```

**Verification**:
- [ ] Autocomplete works
- [ ] Covers all Eurostar stations
- [ ] Screenshot captured

### Prompt 6.7: Search & Filter
```
Budget: $2.00

Add search and filter to bookings/claims:

1. Create apps/web/src/components/ui/search-filter.tsx:
   - Search input with debounce
   - Filter dropdowns
   - Active filter badges
   - Clear all button

2. Update BookingsPage:
   - Search by PNR, train number
   - Filter by status
   - Filter by date range
   - Sort by date/status

3. Update ClaimsPage:
   - Search by booking reference
   - Filter by claim status
   - Filter by compensation amount range
   - Sort by date/amount

Run: pnpm build --filter=@eurostar/web
Screenshot: bookings-with-search.png
Screenshot: claims-with-filters.png
```

**Verification**:
- [ ] Search works
- [ ] Filters work
- [ ] Screenshots captured

### Prompt 6.8: Data Export
```
Budget: $2.00

Add data export functionality:

1. Create apps/web/src/lib/export.ts:
   - exportToCSV(data, filename)
   - exportToJSON(data, filename)
   - exportToPDF(data, filename) - basic table format

2. Add export buttons:
   - Bookings page: Export all bookings
   - Claims page: Export all claims
   - Individual claim: Export claim details

3. Export includes:
   - All relevant fields
   - Formatted dates
   - Human-readable statuses

Run: pnpm build --filter=@eurostar/web
```

**Verification**:
- [ ] CSV export works
- [ ] JSON export works

### Prompt 6.9: Dashboard Analytics
```
Budget: $2.50

Add basic analytics to dashboard:

1. Create apps/web/src/components/dashboard/Analytics.tsx:
   - "Your Travel Stats" section
   - Total journeys tracked
   - Total compensation claimed
   - Average delay encountered
   - Most frequent route

2. Create simple charts:
   - Delays over time (line chart)
   - Compensation by month (bar chart)
   - Routes pie chart

3. Use recharts library (already available from queue timeline)

Run: pnpm build --filter=@eurostar/web
Screenshot: dashboard-analytics.png
```

**Verification**:
- [ ] Analytics section renders
- [ ] Charts work
- [ ] Screenshot captured

### Prompt 6.10: Help & Onboarding
```
Budget: $2.00

Add help system and onboarding:

1. Create apps/web/src/app/help/page.tsx:
   - FAQ section
   - How to use each feature
   - Compensation rules explanation
   - Contact/support info

2. Create apps/web/src/components/ui/tour.tsx:
   - First-time user tour/tooltip guide
   - Highlight key features
   - "Don't show again" option
   - Store completion in localStorage

3. Add help icon to header

Run: pnpm build --filter=@eurostar/web
Screenshot: help-page.png
Screenshot: onboarding-tour.png
```

**Verification**:
- [ ] Help page exists
- [ ] Onboarding tour works
- [ ] Screenshots captured

### Prompts 6.11-6.15: Additional Features
```
Continue with similar pattern for:
- 6.11: Dark mode toggle ($2.00)
- 6.12: Language selector (i18n foundation) ($2.50)
- 6.13: Keyboard shortcuts ($2.00)
- 6.14: Offline support (service worker basics) ($2.50)
- 6.15: PWA manifest ($2.00)
```

### Phase 6 Checkpoint

**All train types supported**:
- [ ] e320 (complete)
- [ ] e300 (new)
- [ ] classic (basic)
- [ ] ruby (basic)

**All features working**:
- [ ] User preferences persist
- [ ] Email import works
- [ ] Notification settings
- [ ] Search & filter
- [ ] Data export
- [ ] Analytics dashboard
- [ ] Help system

---

## Phase 7: Real Integrations

**Goal**: Replace mock data with real integrations.

### Prompt 7.1: Resend Email Setup
```
Budget: $2.50

Integrate Resend for email notifications:

1. Install: pnpm add resend --filter=@eurostar/core

2. Create packages/core/src/email/resend.client.ts:
   - Initialize Resend client
   - Use RESEND_API_KEY env var
   - sendEmail(to, subject, html)
   - Retry logic with exponential backoff

3. Update packages/autoclaim/src/notifications/:
   - Replace mock with real Resend calls
   - Keep React Email templates

4. Create email verification flow:
   - Send verification email on register
   - Verify token endpoint
   - Resend verification option

5. Add env var to .env.example

Run: pnpm build
```

**Verification**:
- [ ] Resend client created
- [ ] Email verification flow works (test with real email)

### Prompt 7.2: GTFS Real-Time Connection
```
Budget: $2.50

Verify and improve GTFS-RT connection:

The poller exists at packages/core/src/gtfs/poller.ts

1. Add health check:
   - Monitor connection status
   - Log connection errors
   - Retry logic improvements

2. Add metrics:
   - Trains processed per poll
   - Delays detected per poll
   - Poll duration
   - Error rate

3. Create admin endpoint:
   - GET /api/v1/admin/gtfs/status
   - Shows last poll time, train count, error count

Run: pnpm build && pnpm worker (test briefly)
```

**Verification**:
- [ ] GTFS connection stable
- [ ] Metrics available

### Prompt 7.3: Environment Configuration
```
Budget: $2.00

Proper environment configuration:

1. Create packages/core/src/config/index.ts:
   - Load and validate all env vars
   - Type-safe config object
   - Throw on missing required vars in production
   - Sensible defaults for development

2. Required variables:
   - DATABASE_URL
   - REDIS_URL
   - JWT_SECRET
   - RESEND_API_KEY
   - GTFS_RT_URL
   - NODE_ENV

3. Create .env.example with all variables documented

4. Update all services to use config module

Run: pnpm build
```

**Verification**:
- [ ] Config module works
- [ ] .env.example complete

### Prompt 7.4: Error Tracking (Sentry)
```
Budget: $2.50

Add Sentry for error tracking:

1. Install Sentry:
   - pnpm add @sentry/nextjs --filter=@eurostar/web
   - pnpm add @sentry/node --filter=@eurostar/core

2. Configure Next.js:
   - Create sentry.client.config.ts
   - Create sentry.server.config.ts
   - Create sentry.edge.config.ts
   - Update next.config.js

3. Configure API:
   - Initialize in server startup
   - Capture all unhandled errors
   - Add user context when available

4. Environment variables:
   - SENTRY_DSN
   - SENTRY_ENVIRONMENT

Run: pnpm build
```

**Verification**:
- [ ] Sentry configured
- [ ] Test error appears in Sentry dashboard

### Prompt 7.5: Rate Limiting
```
Budget: $2.00

Add rate limiting to API:

1. Install: pnpm add @fastify/rate-limit --filter=@eurostar/autoclaim

2. Configure in packages/autoclaim/src/api/app.ts:
   - Global: 100 req/min per IP
   - Auth endpoints: 10 req/min per IP
   - Authenticated: 200 req/min per user
   - Use Redis for distributed rate limiting

3. Add rate limit headers:
   - X-RateLimit-Limit
   - X-RateLimit-Remaining
   - X-RateLimit-Reset

4. Return 429 with helpful message when exceeded

Run: pnpm build
```

**Verification**:
- [ ] Rate limiting works
- [ ] Headers present

### Prompt 7.6: Database Connection Pool
```
Budget: $2.00

Optimize database connection:

1. Update packages/core/src/db/client.ts:
   - Connection pooling configuration
   - Pool size limits (min: 2, max: 10)
   - Connection timeout
   - Idle timeout

2. Add health check:
   - Verify connection on startup
   - Expose pool stats on admin endpoint

3. Add connection retry logic:
   - Retry on connection failure
   - Exponential backoff

Run: pnpm build
```

**Verification**:
- [ ] Pool configured
- [ ] Connection stable

### Prompt 7.7: Redis Cache Layer
```
Budget: $2.50

Add Redis caching:

1. Create packages/core/src/cache/redis.client.ts:
   - Initialize Redis client
   - get/set/del operations
   - TTL support
   - JSON serialization

2. Create packages/core/src/cache/cache.service.ts:
   - Caching decorators/helpers
   - Cache key generation
   - Cache invalidation patterns

3. Add caching to:
   - Seat data (long TTL - static data)
   - Queue predictions (short TTL - 1 min)
   - User preferences (medium TTL - 5 min)

Run: pnpm build
```

**Verification**:
- [ ] Redis caching works
- [ ] Cache hit/miss logging

### Prompt 7.8: Integration Tests
```
Budget: $2.50

Add integration tests for real services:

1. Create packages/core/src/__tests__/integration/:
   - database.integration.test.ts
   - redis.integration.test.ts
   - gtfs.integration.test.ts

2. Tests should:
   - Use test containers or test instances
   - Verify real connections
   - Test actual data flow

3. Add script: pnpm test:integration
   - Requires services running
   - Separate from unit tests

Run: pnpm test:integration (may need docker compose up first)
```

**Verification**:
- [ ] Integration tests pass
- [ ] Real services tested

### Phase 7 Checkpoint

**Real integrations verified**:
- [ ] Resend emails send
- [ ] GTFS-RT fetches real data
- [ ] Sentry captures errors
- [ ] Redis caching works
- [ ] Database pooling stable

---

## Phase 8: Performance & Error Handling

**Goal**: Optimize performance and handle errors gracefully.

### Prompt 8.1: API Error Handling
```
Budget: $2.00

Standardize API error responses:

1. Create packages/autoclaim/src/api/errors/index.ts:
   - AppError base class
   - NotFoundError
   - ValidationError
   - AuthenticationError
   - AuthorizationError
   - RateLimitError

2. Create error handler plugin:
   - Catch all errors
   - Format consistently
   - Log errors with context
   - Hide internal details in production

3. Standard error response:
   {
     error: {
       code: "NOT_FOUND",
       message: "Booking not found",
       details: { ... } // only in development
     }
   }

Run: pnpm build
```

**Verification**:
- [ ] Error handling standardized
- [ ] No stack traces in production

### Prompt 8.2: Frontend Error Boundaries
```
Budget: $2.00

Add React error boundaries:

1. Create apps/web/src/components/errors/ErrorBoundary.tsx:
   - Catches render errors
   - Shows friendly error UI
   - "Try again" button
   - Report to Sentry

2. Create apps/web/src/components/errors/ErrorPage.tsx:
   - Full-page error display
   - Different messages for 404, 500, etc.
   - Back to home link

3. Add error boundaries:
   - Around each major section (seat map, queue, etc.)
   - In root layout

4. Create error.tsx files:
   - apps/web/src/app/error.tsx
   - apps/web/src/app/not-found.tsx

Run: pnpm build --filter=@eurostar/web
Screenshot: error-boundary.png
Screenshot: not-found-page.png
```

**Verification**:
- [ ] Error boundaries work
- [ ] Screenshots captured

### Prompt 8.3: Loading States
```
Budget: $2.00

Ensure all async operations have loading states:

1. Audit all pages for loading states:
   - Dashboard stats loading
   - Bookings table loading
   - Claims table loading
   - Seat map loading
   - Queue data loading

2. Add React Suspense boundaries:
   - Wrap async components
   - Show skeleton loaders

3. Add loading.tsx files:
   - apps/web/src/app/dashboard/loading.tsx
   - apps/web/src/app/bookings/loading.tsx
   - etc.

Run: pnpm build --filter=@eurostar/web
Screenshot: dashboard-loading.png
```

**Verification**:
- [ ] All loading states present
- [ ] Suspense boundaries work

### Prompt 8.4: API Response Caching
```
Budget: $2.00

Add HTTP caching headers:

1. Update API responses with appropriate headers:
   - Static data (seats): Cache-Control: public, max-age=86400
   - User data: Cache-Control: private, no-cache
   - Queue predictions: Cache-Control: public, max-age=60

2. Add ETag support for list endpoints

3. Update Next.js fetch calls:
   - Use appropriate revalidation settings
   - Static generation where possible

Run: pnpm build
```

**Verification**:
- [ ] Caching headers present
- [ ] Responses cached appropriately

### Prompt 8.5: Bundle Size Optimization
```
Budget: $2.00

Optimize frontend bundle size:

1. Analyze bundle:
   - Add @next/bundle-analyzer
   - Run: ANALYZE=true pnpm build --filter=@eurostar/web

2. Optimizations:
   - Dynamic imports for heavy components (charts)
   - Tree shake unused shadcn components
   - Optimize images

3. Target metrics:
   - First Load JS < 100KB per route
   - Total bundle < 500KB

Run: pnpm build --filter=@eurostar/web
```

**Verification**:
- [ ] Bundle analyzed
- [ ] Size within targets

### Prompt 8.6: Database Query Optimization
```
Budget: $2.00

Optimize database queries:

1. Add indexes:
   - Review all query patterns
   - Add missing indexes
   - Generate migration

2. Query optimization:
   - Use select() to limit columns
   - Add pagination to all list queries
   - Eager load relations where needed

3. Add query logging in development:
   - Log slow queries (> 100ms)
   - Log query count per request

Run: pnpm db:generate && pnpm db:migrate
```

**Verification**:
- [ ] Indexes added
- [ ] Queries optimized

### Prompt 8.7: Lighthouse Audit
```
Budget: $2.00

Run Lighthouse audit and fix issues:

1. Run Lighthouse on each page:
   - Dashboard
   - Bookings
   - Claims
   - Seat map
   - Queue times

2. Target scores:
   - Performance: > 90
   - Accessibility: > 95
   - Best Practices: > 95
   - SEO: > 90

3. Fix identified issues:
   - Image optimization
   - Font loading
   - Accessibility issues
   - Meta tags

Run: npx lighthouse http://localhost:3000/dashboard --output=html
```

**Verification**:
- [ ] Lighthouse reports generated
- [ ] Scores meet targets

### Prompts 8.8-8.10: Additional Performance
```
- 8.8: Image optimization (next/image, WebP) ($2.00)
- 8.9: Font optimization (subset, preload) ($2.00)
- 8.10: Service worker for offline ($2.00)
```

### Phase 8 Checkpoint

**Performance metrics**:
- [ ] Lighthouse Performance > 90
- [ ] Bundle size < 500KB
- [ ] API response times < 200ms
- [ ] Database queries optimized

---

## Phase 9: Deployment & CI/CD

**Goal**: Set up production deployment with CI/CD.

### Prompt 9.1: Docker Configuration
```
Budget: $2.00

Create production Docker setup:

1. Create Dockerfile for API:
   - Multi-stage build
   - Node.js 20 alpine base
   - Only production dependencies
   - Non-root user

2. Create Dockerfile for web:
   - Next.js standalone output
   - Minimal image size

3. Update docker-compose.yml:
   - Production profile
   - Health checks
   - Resource limits

4. Create docker-compose.prod.yml:
   - Override for production

Run: docker build -t eurostar-api ./packages/autoclaim
```

**Verification**:
- [ ] Docker images build
- [ ] Images run correctly

### Prompt 9.2: GitHub Actions CI
```
Budget: $2.00

Create CI pipeline:

1. Create .github/workflows/ci.yml:
   - Trigger on push to main, PRs
   - Steps:
     * Checkout
     * Setup Node 20
     * Setup pnpm
     * Install dependencies
     * Lint
     * Type check
     * Unit tests
     * Build

2. Cache dependencies:
   - pnpm store
   - Next.js cache

3. Upload test results as artifacts

Run: Verify workflow syntax
```

**Verification**:
- [ ] Workflow file valid
- [ ] CI passes locally (act or manual)

### Prompt 9.3: E2E Tests in CI
```
Budget: $2.00

Add E2E tests to CI:

1. Update .github/workflows/ci.yml:
   - Add Playwright job
   - Install browsers
   - Start dev server
   - Run E2E tests
   - Upload screenshots on failure

2. Create .github/workflows/e2e.yml:
   - Separate workflow for E2E
   - Run on schedule (nightly)
   - Run on main branch only

Run: Verify workflow syntax
```

**Verification**:
- [ ] E2E workflow configured

### Prompt 9.4: Railway/Fly.io Setup
```
Budget: $2.00

Configure deployment platform:

1. Create railway.toml or fly.toml:
   - Service configuration
   - Environment variables
   - Health checks
   - Scaling settings

2. Create deployment scripts:
   - scripts/deploy-staging.sh
   - scripts/deploy-production.sh

3. Document required secrets:
   - DATABASE_URL
   - REDIS_URL
   - JWT_SECRET
   - RESEND_API_KEY
   - SENTRY_DSN

Run: Verify configuration
```

**Verification**:
- [ ] Deploy config created
- [ ] Secrets documented

### Prompt 9.5: Database Migrations in CD
```
Budget: $2.00

Add database migrations to deployment:

1. Create migration script:
   - scripts/migrate-production.sh
   - Runs Drizzle migrations
   - With backup before migration
   - Rollback on failure

2. Add to CD pipeline:
   - Run migrations before deploying app
   - Wait for migrations to complete

3. Add migration health check:
   - Verify all migrations applied
   - Log migration status

Run: Verify script
```

**Verification**:
- [ ] Migration script works

### Prompt 9.6: Preview Deployments
```
Budget: $2.00

Set up preview deployments:

1. Create .github/workflows/preview.yml:
   - Trigger on PR
   - Deploy to preview URL
   - Comment URL on PR
   - Auto-delete on PR close

2. Configure Vercel/Railway preview:
   - Automatic preview per PR
   - Unique URL per PR

Run: Verify workflow
```

**Verification**:
- [ ] Preview workflow configured

### Prompt 9.7: Monitoring Setup
```
Budget: $2.00

Add production monitoring:

1. Health check endpoints:
   - GET /api/health (basic)
   - GET /api/health/ready (with dependencies)
   - GET /api/health/live (liveness)

2. Uptime monitoring:
   - Configure UptimeRobot or similar
   - Alert on downtime

3. Log aggregation:
   - Configure logging format
   - JSON structured logs

Run: pnpm build
```

**Verification**:
- [ ] Health endpoints work

### Prompt 9.8: Security Headers
```
Budget: $2.00

Add security headers:

1. Create middleware for security headers:
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy
   - Permissions-Policy

2. Update Next.js config:
   - Add headers in next.config.js

3. Verify with securityheaders.com

Run: pnpm build
```

**Verification**:
- [ ] Security headers present
- [ ] Good security score

### Phase 9 Checkpoint

**Deployment ready**:
- [ ] Docker images build
- [ ] CI pipeline passes
- [ ] E2E tests in CI
- [ ] Deploy config ready
- [ ] Migrations automated
- [ ] Monitoring configured

---

## Phase 10: Documentation

**Goal**: Complete documentation for users and developers.

### Prompt 10.1: README Update
```
Budget: $2.00

Update root README.md:

1. Project overview
2. Features list with screenshots
3. Quick start guide
4. Development setup
5. Deployment guide
6. Contributing guidelines
7. License

Include badges: build status, test coverage, license.
```

### Prompt 10.2: API Documentation
```
Budget: $2.00

Generate API documentation:

1. Add OpenAPI/Swagger:
   - Install @fastify/swagger
   - Generate spec from TypeBox schemas
   - Serve at /api/docs

2. Create docs/API.md:
   - All endpoints documented
   - Request/response examples
   - Authentication guide
```

### Prompt 10.3: User Guide
```
Budget: $2.00

Create user documentation:

1. Create docs/USER_GUIDE.md:
   - Getting started
   - Adding your first booking
   - Understanding delay compensation
   - Using the seat map
   - Using queue predictions

2. Add screenshots for each section
```

### Prompt 10.4: Architecture Documentation
```
Budget: $2.00

Create architecture documentation:

1. Create docs/ARCHITECTURE.md:
   - System overview diagram
   - Package dependencies
   - Data flow diagrams
   - Key design decisions
   - Technology choices rationale
```

### Prompt 10.5: Runbook
```
Budget: $2.00

Create operations runbook:

1. Create docs/RUNBOOK.md:
   - Common issues and solutions
   - How to restart services
   - How to rollback deployment
   - How to check logs
   - How to scale
   - Emergency contacts
```

### Phase 10 Checkpoint

**Documentation complete**:
- [ ] README comprehensive
- [ ] API documented
- [ ] User guide written
- [ ] Architecture documented
- [ ] Runbook created

---

## Final Checklist

### Before Launch

**Code Quality**:
- [ ] All tests pass (unit + E2E)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Bundle size optimized

**Security**:
- [ ] Auth fully implemented
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] No secrets in code
- [ ] HTTPS enforced

**Performance**:
- [ ] Lighthouse scores > 90
- [ ] API responses < 200ms
- [ ] Database queries optimized
- [ ] Caching configured

**Reliability**:
- [ ] Error handling complete
- [ ] Health checks working
- [ ] Monitoring configured
- [ ] Alerting set up

**Documentation**:
- [ ] README complete
- [ ] API documented
- [ ] User guide available
- [ ] Runbook prepared

**Deployment**:
- [ ] CI/CD pipeline working
- [ ] Staging environment tested
- [ ] Production config ready
- [ ] Rollback plan documented

---

## Appendix: Orchestration Commands

### Standard prompt execution:
```bash
claude -p "PROMPT" \
  --permission-mode bypassPermissions \
  --max-budget-usd [BUDGET] \
  --output-format text 2>&1
```

### After each prompt:
```bash
# Build check
pnpm build

# Test check
pnpm test

# E2E check (if UI changed)
pnpm test:e2e
```

### Screenshot capture (for visual verification):
```bash
# Start dev server
pnpm dev &

# Wait for server
sleep 10

# Capture screenshot via Playwright
pnpm test:e2e:screenshots
```

### Phase completion:
1. Run all verification steps
2. Review all screenshots
3. Manual testing if needed
4. Update scratchpad with progress
5. Commit checkpoint: `git commit -m "Phase X complete"`
