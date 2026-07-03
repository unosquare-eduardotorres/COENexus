# Test Generation Changelog

All runs are tracked here with dates, focus areas, and outcomes.

---

## Run 1 — Discovery (2026-04-21)

**Focus**: `discovery`
**New test files**: 0
**New test cases**: 0

### Deliverables
- `tests/_meta/discovery.md` — Full architecture map, existing test inventory (150 files), prioritized gap analysis
- `tests/_meta/CHANGELOG.md` — This file
- `tests/README.md` — Run instructions and mock mode documentation

### Key Findings
- 150 existing test files (63 main process, 87 renderer, 2 E2E)
- Coverage thresholds: statements 25%, branches 20%, functions 25%, lines 25%
- **High-risk gaps identified**: scout9AgentService, scout9ChatService, oracleChatService, oracleMcpServer, 10 agents DB repositories, 18 IPC handlers, pipeline orchestrators, vigil scheduler/executor
- Total estimated new tests across all runs: ~246

### Next Run
**Run 2** — `focus: mocks` — Claude SDK mock harness and shared test helpers

---

## Run 2 — Mock Harness (2026-04-21)

**Focus**: `mocks`
**New test files**: 0 (infrastructure only)
**New helper files**: 6

### Deliverables

| File | Purpose |
|------|---------|
| `tests/_helpers/claudeMock.ts` | `ScriptedClaudeClient` — deterministic mock for `@anthropic-ai/claude-agent-sdk` `query()`. Builders: `textMessage()`, `toolUseMessage()`, `resultMessage()`, `streamDelta()`, `mixedAssistantMessage()`, `maxTurnsError()`. `installClaudeSdkMock()` for `vi.doMock`. |
| `tests/_helpers/agentFactory.ts` | `createAgentHarness()` — one-call setup: ScriptedClaudeClient + event collector + AbortController + config/electron/logger/claudeService mocks. `createMinimalEmitter()`, `findEvents()`, `findLogMessages()` utilities. |
| `tests/_helpers/mockDb.ts` | In-memory SQLite factories: `createAgentsDb()`, `createNexusDb()`, `createPathDb()` load real schema.sql files. `seedRows()` bulk inserts. `stripVecExtensions()` filters sqlite-vec virtual tables for compatibility. |
| `tests/_helpers/mockLogger.ts` | `createMockLogger()` returns `{ info, warn, error, debug }` vi.fn() stubs. `mockLoggerModule()` returns `{ createLogger }` for `vi.mock`. DRY replacement for inline logger mocks across 39+ test files. |
| `tests/_helpers/sandbox.ts` | `createSandbox()` / `useSandbox()` for temp directories with auto-cleanup. `isolateModules()` for `vi.doMock` + dynamic import. `createAbortableSignal()` with timeout. |
| `tests/_helpers/cassette.ts` | `CassetteReplayClient` — hash-based cassette lookup for replay mode. `loadCassette()`, `saveCassette()`, `recordEntry()`, `findEntry()` for `tests/cassettes/*.json`. |

### Design Decisions
- **ScriptedClaudeClient** uses sequential expectation matching (call index) rather than content-based matching for deterministic test ordering
- **mockDb** loads real `schema.sql` files to ensure test schemas stay in sync with production — no hand-maintained DDL copies
- **stripVecExtensions** filters `CREATE VIRTUAL TABLE ... vec0` statements since sqlite-vec native extension is unavailable in test environments
- **agentFactory** pre-wires all common mocks (electron, config, logger, claudeService) so agent service tests need only configure Claude response expectations
- **cassette.ts** uses SHA-256 hash prefix matching for prompt/system-prompt lookup, supporting both exact and system-agnostic matching

### Next Run
**Run 3** — `focus: unit (non-agent)` — Vigil infrastructure, schedulers, utility services, pipeline orchestrators, untested repositories

---

## Run 3 — Non-Agent Unit Tests (2026-04-22)

**Focus**: `unit (non-agent)` — Skipped P0 agent/MCP tests per user request
**New test files**: 14
**New test cases**: 120

### Service Tests (12 files, 78 tests)

| File | Tests | Coverage |
|------|-------|----------|
| `vigilScheduler.test.ts` | 8 | parseSources, minuteKey, tick skip conditions (disabled, dedup, inflight, no token) |
| `vigilExecutor.test.ts` | 10 | run, cancel, getStatus, retry, failed records, error handling |
| `vigilEventMapper.test.ts` | 4 | record/error/complete event mapping |
| `vigilTokenStore.test.ts` | 5 | set/get token, whitespace handling, env fallback |
| `vigilTools.test.ts` | 8 | withTimeout, ToolCallTracker, createVigilTools budget checks |
| `braniacScheduler.test.ts` | 4 | trigger, cancel, getStatus delegation |
| `subscriptionService.test.ts` | 8 | CLI check, auth check (JSON, non-JSON, fallback), validateAll short-circuits |
| `dynamicContentService.test.ts` | 4 | Claude unavailable, JSON parsing, unparseable response, sort order |
| `agentStubExecutor.test.ts` | 5 | unknown agent, narrate steps, emitDirect, step counts, error handling |
| `promptTemplates.test.ts` | 8 | fillTemplate, OPUS_ANALYSIS/MATCH_ENGINE/BENCH_BURN/PRESENTATION template validation |
| `unifiedPipelineOrchestrator.test.ts` | 7 | run, pause, empty set, retry, retrySingle, progress/record counts |
| `positionPipelineOrchestrator.test.ts` | 7 | run, pause, empty list, retry, retrySingle, progress/record events |

### Repository Tests (2 files, 42 tests — requires `npm rebuild` for native module)

| File | Tests | Coverage |
|------|-------|----------|
| `presentationRepository.test.ts` | 8 | session/entry CRUD, list, delete |
| 10 agents DB repos | 34 | vigilRepository (8), oracleRepository (3), jobRepository (6), exchangeRateRepository (4), patternRepository (6), salaryBandRepository (6), reportRepository (6), knowledgeRepository (6), brainRepository (4), configRepository (4) |

### Design Decisions
- Used `vi.hoisted()` for mock variables referenced in `vi.mock()` factory functions (Vitest 4.x hoisting)
- Repository tests use `createAgentsDb()` from shared helpers, loading real `agents/schema.sql` for schema fidelity
- Pipeline orchestrator tests fully mock external dependencies (upstream API, sync repo, embedding service) to test orchestration flow
- Service tests use module reset (`vi.resetModules()`) for testing module-level state (token store, scheduler)

### Known Issues
- Repository tests require `npm rebuild better-sqlite3` due to NODE_MODULE_VERSION mismatch (Electron vs Node.js). This is a pre-existing environment issue also affecting `stakeholderProfileRepository.test.ts`.

### Next Run
**Run 4** — `focus: unit (agent)` — P0 agent services: scout9AgentService, scout9ChatService, oracleChatService, scout9McpServer, oracleMcpServer (~55 tests)
