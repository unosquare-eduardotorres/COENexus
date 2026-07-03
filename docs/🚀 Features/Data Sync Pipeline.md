---
status: done
priority: critical
requested: 2026-02-15
completed: 2026-03-20
tags: [feature, sync, data]
---

# Feature: Data Sync Pipeline

## Summary
Real-time data synchronization pipeline that fetches candidates, employees, and open positions from the upstream Unosquare HR API. Includes token validation, incremental sync, progress streaming, and error handling with retry logic.

## Motivation
The match engine depends on fresh candidate and position data. Manual data entry is error-prone and doesn't scale. The sync pipeline ensures the local SQLite database stays current with the upstream HR systems.

## Acceptance Criteria
- [x] Token-based authentication with upstream API
- [x] Sync candidates, employees, and open positions
- [x] Incremental sync (only fetch changes since last sync)
- [x] Progress streaming to renderer via IPC events
- [x] Error handling with retry logic
- [x] Sync history and status tracking

## Technical Notes
- **IPC Channels**: `sync:*` domain
- **Services**: `upstreamApiService.ts`, `syncOrchestrator.ts`, `catalogService.ts`
- **DB Tables**: `synced_candidates`, `synced_employees`, `synced_open_positions`
- **Page**: `DataSyncPage`

## Related
- [[Roadmap]]
- [[Match Engine]]
- [[Database Schema]]

## Progress Log
| Date | Update |
|------|--------|
| 2026-02-15 | Feature requested |
| 2026-03-01 | Upstream API integration working |
| 2026-03-10 | Incremental sync and progress streaming |
| 2026-03-20 | ✅ Error handling and retry logic complete |
