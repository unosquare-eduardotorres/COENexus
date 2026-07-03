---
status: done
priority: high
requested: 2026-03-01
completed: 2026-03-25
tags: [feature, matching]
---

# Feature: Bench Burn Flow

## Summary
Specialized matching flow that cross-matches bench employees (those not currently assigned to projects) against open positions. Uses the same embedding + AI scoring pipeline as the standard match engine but with a bench-specific data source and UI flow.

## Motivation
Reducing bench time is a key business metric. This flow enables recruiters and staffing managers to quickly find suitable positions for bench employees, reducing idle time and improving utilization rates.

## Acceptance Criteria
- [x] Fetch bench employees from upstream HR system
- [x] Cross-match against all open positions
- [x] Display cross-match results with scoring breakdown
- [x] Bench-specific step flow UI (`BenchBurnStepKey`)
- [x] Session persistence for bench burn results

## Technical Notes
- **IPC Channels**: Uses `match:*` channels + bench-specific handlers
- **Services**: `benchBurnService.ts` (main + renderer)
- **Types**: `BenchEmployee`, `BenchOpenPosition`, `CrossMatchResult`, `BenchBurnResult`
- **Page**: `BenchBurnPage`

## Related
- [[Roadmap]]
- [[Match Engine]]
- [[Data Sync Pipeline]]

## Progress Log
| Date | Update |
|------|--------|
| 2026-03-01 | Feature requested |
| 2026-03-10 | Bench employee data pipeline working |
| 2026-03-20 | Cross-matching logic complete |
| 2026-03-25 | ✅ UI flow and session persistence done |
