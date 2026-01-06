# Meta-Orchestration Audit Report

## Executive Summary

This document analyzes why the meta-orchestration approach failed and proposes a simplified GitHub-native solution.

**Core Problem:** Each Claude instance worked in isolation, inventing its own API shapes, resulting in frontend-backend mismatches and placeholder implementations.

**Solution:** `Issue (Contract) → PR (Implementation) → One Claude Instance`

---

## Table of Contents

1. [What Went Wrong](#1-what-went-wrong)
2. [Failure Catalog](#2-failure-catalog)
3. [Root Cause Analysis](#3-root-cause-analysis)
4. [Proposed Solution: Simplified GitHub Workflow](#4-proposed-solution-simplified-github-workflow)
5. [Implementation Guide](#5-implementation-guide)
6. [CI Workflow](#6-ci-workflow)
7. [Migration Checklist](#7-migration-checklist)

---

## 1. What Went Wrong

### The Broken Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WHAT WE DID (BROKEN)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Orchestrator runs 94 prompts sequentially:                                 │
│                                                                             │
│  claude -p "Build seat map UI"     →  Claude A invents /seats/{type}/all   │
│  claude -p "Build seat map API"    →  Claude B creates /seats/{type}/coaches│
│                                                                             │
│  Result: Endpoint mismatch. Feature broken.                                 │
│                                                                             │
│  Problems:                                                                  │
│  • No shared contract between prompts                                       │
│  • No verification that things integrate                                    │
│  • Direct commits to codebase (no PR review)                                │
│  • Broken code "completes" without anyone noticing                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Isolation Problem

Each Claude instance had:
- No knowledge of what other instances would create
- No shared contract defining API shapes
- No way to verify integration
- Freedom to "invent" whatever seemed reasonable

---

## 2. Failure Catalog

### 2.1 Seat Map - BROKEN

| Frontend Calls | Backend Provides | Result |
|----------------|------------------|--------|
| `/api/v1/seats/{trainType}/all` | `/api/v1/seats/{trainType}/coaches` | 404 Error |

**Files:**
- `apps/web/src/app/(protected)/seatmap/page.tsx:95-96` - Calls wrong endpoint
- `packages/autoclaim/src/api/handlers/seats.handler.ts` - Different endpoints

### 2.2 Queue Times - STATIC DATA

| Expected | Actual |
|----------|--------|
| Different predictions per date | Same curve for all days |
| Date parameter in API | API ignores date, uses `new Date()` |
| Real prediction model | `lookup(dayOfWeek, hour)` static table |

**Files:**
- `packages/autoclaim/src/api/handlers/queue.handler.ts:142` - Always uses current time
- `packages/euroqueue/src/services/prediction.service.ts:49` - Day-of-week lookup only
- `packages/euroqueue/src/data/historical-baseline.ts` - Deterministic fake data

### 2.3 Additional Endpoint Mismatches

| Feature | Frontend Calls | Backend Has |
|---------|---------------|-------------|
| Queue Status | `/queue/{terminal}/status` | `/queue/{terminal}/current` |
| Queue Predictions | `/queue/{terminal}/predictions` | `/queue/{terminal}/timeline` |

---

## 3. Root Cause Analysis

### The Five Whys

```
WHY did features break?
└── Frontend calls endpoints that don't exist

    WHY?
    └── Frontend Claude didn't know what Backend Claude would create

        WHY?
        └── No shared contract, isolated execution

            WHY?
            └── Production plan didn't enforce contracts first

                WHY?
                └── Orchestration assumed each prompt would "figure it out"
```

### Systemic Failures

| Failure | Impact |
|---------|--------|
| No contracts | Each Claude invents own API shape |
| No dependencies | Frontend built before backend |
| No gates | Broken features "complete" |
| Mocked tests | Tests pass, real integration fails |
| No review | Placeholder code accepted |

### Specification Quality

| Level | Description | What We Did |
|-------|-------------|-------------|
| L1 | Vague ("add feature X") | ✓ This |
| L2 | Behavioral ("user can do Y") | ✓ Sometimes |
| L3 | Contract ("endpoint returns Z") | ✗ Never |
| L4 | Verified (L3 + tests pass) | ✗ Never |

**All prompts were L1-L2. Production requires L3-L4.**

---

## 4. Proposed Solution: Simplified GitHub Workflow

### Core Pattern

```
Issue (Contract) → PR (Implementation) → One Claude Instance
```

That's it. No complex automation. No Claude bots in GitHub Actions. Just:

1. **Issue defines the contract** - What endpoints, what shapes
2. **One Claude creates PR** - Implements exactly what the issue specifies
3. **Standard CI runs** - Build, test (no Claude in CI)
4. **Manual review when needed** - Spawn another Claude locally to review

### The Simple Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SIMPLIFIED WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: Create Issue (This is the Contract)                                │
│  ───────────────────────────────────────────                                │
│  gh issue create --title "Add seat map API" --body "                        │
│  ## Contract                                                                │
│  GET /api/v1/seats/{trainType}/all → SeatInfo[]                             │
│  POST /api/v1/seats/{trainType}/recommend → Recommendation[]                │
│                                                                             │
│  ## Acceptance Criteria                                                     │
│  - Endpoints return data matching schema                                    │
│  - Integration tests pass                                                   │
│  "                                                                          │
│                                                                             │
│  STEP 2: One Claude Creates PR                                              │
│  ─────────────────────────────────                                          │
│  claude -p "Implement Issue #1. Read the contract in the issue.             │
│            Create a PR when done. Link to the issue."                       │
│                                                                             │
│  Claude:                                                                    │
│  - Reads issue #1 to get the contract                                       │
│  - Implements exactly those endpoints                                       │
│  - Creates PR: gh pr create --title "feat: seat map API" --body "..."       │
│                                                                             │
│  STEP 3: Standard CI (No Claude)                                            │
│  ────────────────────────────────                                           │
│  GitHub Actions runs:                                                       │
│  - pnpm build                                                               │
│  - pnpm test                                                                │
│  - pnpm test:integration                                                    │
│                                                                             │
│  STEP 4: Review (When Needed)                                               │
│  ────────────────────────────                                               │
│  If you want Claude to review:                                              │
│  claude -p "Review PR #2. Does it match Issue #1 contract?                  │
│            Test the endpoints. Post review via gh pr review."               │
│                                                                             │
│  STEP 5: Merge                                                              │
│  ─────────────                                                              │
│  gh pr merge 2 --squash                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Works

| Problem | Solution |
|---------|----------|
| Claude A doesn't know what Claude B creates | Issue defines contract FIRST |
| No verification | Standard CI (build, test) |
| Broken code on main | Branch protection requires CI |
| No review | Human or spawn Claude locally |
| Need complex automation? | No - just `gh` CLI |

### Comparison

| Aspect | Old (Broken) | New (Simple) |
|--------|--------------|--------------|
| Contract | None | Issue body |
| Work unit | Direct commit | PR |
| Verification | None | GitHub CI |
| Review | None | Manual / Claude locally |
| Complexity | 94 sequential prompts | Issue → PR → Merge |
| Dependencies | Implicit | "Depends on #X" in PR |

---

## 5. Implementation Guide

### 5.1 Issue Template (Contract)

Create `.github/ISSUE_TEMPLATE/feature.yml`:

```yaml
name: Feature Request
description: Define a new feature with API contract
labels: [feature]
body:
  - type: textarea
    id: contract
    attributes:
      label: API Contract
      description: Define the endpoints this feature requires
      placeholder: |
        GET /api/v1/example/{id}
        Response: { data: ExampleType }

        POST /api/v1/example
        Body: { name: string }
        Response: { id: string }
    validations:
      required: true

  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
      description: How do we know this is done?
      placeholder: |
        - [ ] Endpoint returns correct data
        - [ ] Types match contract
        - [ ] Integration tests pass
    validations:
      required: true

  - type: textarea
    id: depends
    attributes:
      label: Dependencies
      description: What must be done first?
      placeholder: "Depends on #X (API contract)"
```

### 5.2 PR Template

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary
<!-- What does this PR do? -->

## Implements
<!-- Link to the issue this implements -->
Closes #___

## Contract Compliance
<!-- Check that implementation matches issue contract -->
- [ ] All endpoints from contract implemented
- [ ] Response shapes match contract
- [ ] Error cases handled

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing done

## Checklist
- [ ] Code builds without errors
- [ ] Tests pass
- [ ] No TypeScript errors
```

### 5.3 Branch Protection

```bash
# Enable branch protection via gh CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  -f required_status_checks='{"strict":true,"contexts":["build","test"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1}'
```

Or via GitHub UI:
1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Check: "Require a pull request before merging"
4. Check: "Require status checks to pass"
5. Add checks: `build`, `test`

---

## 6. CI Workflow

Simple CI - no Claude, no complexity:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  integration:
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: eurostar_test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/eurostar_test
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/eurostar_test
          REDIS_URL: redis://localhost:6379
```

---

## 7. Migration Checklist

### Immediate (Today)

```bash
# 1. Initialize git if needed
git init
git add .
git commit -m "chore: initial commit"

# 2. Create GitHub repo
gh repo create eurostar-tools --private --source=. --push

# 3. Add CI workflow
mkdir -p .github/workflows
# Add ci.yml from section 6
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow"
git push

# 4. Enable branch protection
gh api repos/{owner}/eurostar-tools/branches/main/protection \
  --method PUT \
  -f required_status_checks='{"strict":true,"contexts":["build","test"]}'
```

### This Week

- [ ] Create issue templates (section 5.1)
- [ ] Create PR template (section 5.2)
- [ ] Fix broken features via PRs:
  - [ ] Issue #1: Contract for seat map API fix
  - [ ] PR #1: Add missing `/seats/{trainType}/all` endpoint
  - [ ] Issue #2: Contract for queue times fix
  - [ ] PR #2: Add date parameter to queue predictions

### Example: Fixing Seat Map

```bash
# Step 1: Create issue with contract
gh issue create \
  --title "Fix: Add missing seat map endpoint" \
  --body "## Contract
GET /api/v1/seats/{trainType}/all

Returns all seats for the specified train type.

Response:
\`\`\`typescript
SeatInfo[]
\`\`\`

## Acceptance Criteria
- [ ] Endpoint exists and returns data
- [ ] Frontend seat map loads without error
- [ ] Integration test verifies response shape"

# Step 2: Spawn Claude to implement
claude -p "Implement Issue #1 (Fix: Add missing seat map endpoint).
Read the contract in the issue.
Create branch, implement, create PR.
Link PR to the issue with 'Closes #1'."

# Step 3: Wait for CI to pass (automatic)

# Step 4: Review if needed
claude -p "Review PR #X. Test the /seats/e320/all endpoint.
Verify it returns seat data. Post review via gh pr review."

# Step 5: Merge
gh pr merge X --squash
```

---

## Summary

### Before (Complex, Broken)

```
94 prompts → 94 Claude instances → Direct commits → No verification → Broken
```

### After (Simple, Working)

```
Issue (contract) → PR (one Claude) → CI (standard) → Review (optional) → Merge
```

### Key Principles

1. **Issue = Contract** - Define endpoints before implementing
2. **One Claude per PR** - Reads issue, implements, creates PR
3. **Standard CI** - No Claude in GitHub Actions, just build/test
4. **Manual review** - Spawn Claude locally when needed
5. **Branch protection** - Nothing merges without CI passing

The solution isn't more automation—it's **structured work with verification**.

---

*Document generated: 2026-01-06*
