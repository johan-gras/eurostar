# Lessons Learned - Orchestration Process

This document tracks mistakes made during the orchestration process to prevent repeating them.

---

## Lesson 1: Run CI Locally Before Pushing

**Date:** 2026-01-06
**Discovered:** After pushing initial commit to GitHub

**What went wrong:**
- Pushed 72,000+ lines of code to GitHub without running `pnpm lint` locally
- CI failed on the very first commit
- All subsequent PRs inherited this failure

**Impact:**
- 31 ESLint errors in the codebase
- All PRs blocked from merging
- Wasted CI minutes

**Prevention:**
```bash
# ALWAYS run before pushing:
pnpm lint
pnpm build
pnpm test
```

**Checklist item:** Before any `git push`, run full CI locally.

---

## Lesson 2: Check CI Status After Every Commit/PR

**Date:** 2026-01-06
**Discovered:** User pointed out CI was failing

**What went wrong:**
- Created 3 PRs without checking if CI passed
- Assumed CI would pass because the changes were small
- Didn't notice CI was failing on main branch too

**Impact:**
- PRs appeared "ready" but were actually blocked
- Delayed discovery of root issue

**Prevention:**
```bash
# After creating PR:
gh pr checks <PR_NUMBER> --repo <REPO> --watch

# Or at minimum:
gh pr checks <PR_NUMBER> --repo <REPO>
```

**Checklist item:** After creating PR, wait for CI and verify it passes.

---

## Lesson 3: Review PRs Immediately After Creation

**Date:** 2026-01-06
**Discovered:** User asked why PRs weren't reviewed

**What went wrong:**
- Created PRs and moved on without reviewing the diff
- PR #6 had wrong endpoint names (would have conflicted with PR #5)
- Only caught this when user asked about review

**Impact:**
- PR #6 would have broken the queue feature if merged
- Required additional fix commit

**Prevention:**
```bash
# After PR is created:
gh pr diff <PR_NUMBER> --repo <REPO>

# Review against the issue contract
gh issue view <ISSUE_NUMBER> --repo <REPO>
```

**Checklist item:** Review every PR diff against its issue contract before moving on.

---

## Lesson 4: PRs Should Build on Each Other When Related

**Date:** 2026-01-06
**Discovered:** During PR #6 review

**What went wrong:**
- PR #6 was created from `main` branch
- PR #5 fixed endpoint names, but PR #6 didn't have those fixes
- PR #6 would have reverted PR #5's changes

**Impact:**
- Merge conflict or regression waiting to happen
- Required manual fix

**Prevention:**
- For related PRs, create a chain: `main` → PR #5 branch → PR #6 branch
- Or ensure PR #6 includes changes from PR #5
- Use `gh pr view --json baseRefName` to verify base branch

**Checklist item:** For related changes, verify PR base branch includes prior fixes.

---

## Lesson 5: Verify Base Codebase Quality Before Starting

**Date:** 2026-01-06
**Discovered:** After all PRs failed CI

**What went wrong:**
- Assumed the existing codebase was CI-ready
- Pushed 72K lines without verifying lint/build/test worked
- Original meta-orchestration never ran CI

**Impact:**
- All work blocked until baseline is fixed
- 31 lint errors to fix before any PR can merge

**Prevention:**
```bash
# Before pushing ANY code to a new repo:
pnpm install
pnpm lint
pnpm build
pnpm test

# Only push if all pass
```

**Checklist item:** Verify codebase passes all CI checks before pushing to remote.

---

## Lesson 6: The Orchestration Pattern Must Include Verification

**Date:** 2026-01-06
**Discovered:** Throughout the session

**What went wrong:**
- Original pattern: `Issue → Claude → PR → Merge`
- Missing: Verification at every step

**Correct pattern:**
```
Issue (Contract)
    ↓
Claude creates PR
    ↓
**VERIFY: Review diff against contract**
    ↓
**VERIFY: Check CI status**
    ↓
**VERIFY: Test locally if needed**
    ↓
Merge
```

**Checklist item:** Never skip verification steps, even for "simple" changes.

---

## Master Checklist

Use this before/after each operation:

### Before Pushing to Remote
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes

### After Creating PR
- [ ] Review diff: `gh pr diff <N>`
- [ ] Verify against issue contract
- [ ] Check CI status: `gh pr checks <N>`
- [ ] Wait for CI to complete
- [ ] Verify CI passed

### Before Moving to Next Task
- [ ] Current PR reviewed
- [ ] Current PR CI passing
- [ ] No blocking issues identified

---

## Lesson 7: Verify Delegated Work is Complete

**Date:** 2026-01-06
**Discovered:** Checking CI for PR #10 (ESLint fixes)

**What went wrong:**
- Delegated "fix all 31 ESLint errors" to nested Claude instance
- Instance reported task complete
- CI still failed - only fixed some packages, missed 50+ errors in autoclaim package

**Impact:**
- False sense of completion
- Additional iteration required
- CI still blocked

**Prevention:**
- After delegated work, run verification locally:
```bash
pnpm lint && pnpm build && pnpm test
```
- Don't trust "done" status - verify output matches expectation
- Be specific in delegation: "Fix ALL lint errors in ALL packages"

**Checklist item:** Verify delegated work passes ALL checks before considering it done.

---

## Lesson 8: Build Errors Also Block CI

**Date:** 2026-01-06
**Discovered:** After fixing lint errors, build still failed

**What went wrong:**
- Focus was on ESLint errors (31 reported)
- Didn't check if `pnpm build` passed
- Pre-existing TypeScript error (missing `Redis` import) went unnoticed

**Impact:**
- Even after lint fix, CI still failed
- Build error was present on main branch all along

**Prevention:**
- Always run full CI locally: `pnpm lint && pnpm build && pnpm test`
- Don't just run lint - the build can have separate errors

**Checklist item:** Run full CI (lint + build + test), not just lint.

---

## Error Log

| Date | Error | Root Cause | Time Lost |
|------|-------|------------|-----------|
| 2026-01-06 | CI failing on all PRs | Never ran lint before push | ~30 min |
| 2026-01-06 | PR #6 wrong endpoints | Branched from main, not PR #5 | ~10 min |
| 2026-01-06 | Didn't notice CI failures | Didn't check CI status | ~20 min |
| 2026-01-06 | PR #10 incomplete | Delegated fix only covered some packages | ~15 min |
| 2026-01-06 | Build error in server.ts | Missing Redis type import pre-existing | ~10 min |

---

*Last updated: 2026-01-06*
