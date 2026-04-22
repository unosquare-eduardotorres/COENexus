# Comprehensive Test Suite Generation — Discovery Report

> **Generated**: 2026-04-21
> **Run**: 1 of 9 (`focus: discovery`)
> **Project**: COE Operation Nexus

---

## Run Configuration

```
focus: discovery
max_new_tests_per_run: 150
prioritize_uncovered: true
```

---

## 1. Stack Identification

| Aspect | Technology |
|--------|------------|
| Language | TypeScript (Node.js main process + React renderer) |
| Test Framework | **Vitest 4.0** (multi-project: `renderer` jsdom + `main` node) |
| E2E Framework | **Playwright** (Electron launch + CDP) |
| Mocking | `vi.mock` / `vi.fn` (Vitest built-in) |
| Assertion | Vitest built-in `expect` + `@testing-library/jest-dom` |
| Coverage | `v8` provider via Vitest (`coverage-v8`) |
| Config | `vitest.config.ts` — two projects: `renderer` (jsdom, setup: `src/renderer/test-setup.ts`) and `main` (node) |
| Test Pattern | `*.test.ts` / `*.test.tsx` colocated; `__tests__/` dirs for main services/repos |
| Coverage Thresholds | statements: 25%, branches: 20%, functions: 25%, lines: 25% |

---

## 2. Architecture Map

### Agent/Specialist Modules (Claude SDK Consumers)

| Module | File | Role | Claude SDK? | MCP Tools? |
|--------|------|------|-------------|------------|
| **claudeService** | `src/main/services/claudeService.ts` | Core Claude wrapper — `query()` from `@anthropic-ai/claude-agent-sdk` | ✅ Direct | ❌ |
| **scout9AgentService** | `src/main/services/scout9AgentService.ts` | Scout9 agentic runner — multi-turn with MCP tools | ✅ Direct | ✅ scout9McpServer |
| **scout9ChatService** | `src/main/services/scout9ChatService.ts` | Scout9 chat interface with streaming | ✅ Direct | ✅ scout9McpServer |
| **oracleChatService** | `src/main/services/oracleChatService.ts` | Oracle DB-query chat agent with streaming | ✅ Direct | ✅ oracleMcpServer |
| **braniacExecutor** | `src/main/services/braniacExecutor.ts` | Braniac analysis agent (uses claudeService.chatAsync) | ✅ Indirect | ❌ |
| **vigilExecutor** | `src/main/services/vigilExecutor.ts` | Vigil sync executor (no Claude usage) | ❌ | ❌ |
| **agentStubExecutor** | `src/main/services/agentStubExecutor.ts` | Stub/demo agent with simulated steps | ❌ | ❌ |
| **agentNarrator** | `src/main/services/agentNarrator.ts` | AI narration of agent steps (uses claudeService) | ✅ Indirect | ❌ |
| **matchEngineService** | `src/main/services/matchEngineService.ts` | Match engine with Haiku triage + deep analysis (uses claudeService) | ✅ Indirect | ❌ |

### MCP Server Modules (Tool Providers)

| Module | File | Tools Provided |
|--------|------|---------------|
| **scout9McpServer** | `src/main/services/scout9McpServer.ts` | Scout9-specific DB query tools |
| **scout9Tools** | `src/main/services/scout9Tools.ts` | Tool definitions + `ToolCallTracker` class |
| **oracleMcpServer** | `src/main/services/oracleMcpServer.ts` | Dynamic SQL query tools with safety checks |
| **vigilTools** | `src/main/services/vigilTools.ts` | Vigil tool definitions + `ToolCallTracker` class |

### Orchestrators & Pipelines

| Module | File | Purpose |
|--------|------|---------|
| **syncOrchestrator** | `src/main/services/syncOrchestrator.ts` | HR data sync coordination |
| **processingOrchestrator** | `src/main/services/processingOrchestrator.ts` | Text extraction + vectorization pipeline |
| **unifiedPipelineOrchestrator** | `src/main/services/unifiedPipelineOrchestrator.ts` | Unified record processing pipeline |
| **positionPipelineOrchestrator** | `src/main/services/positionPipelineOrchestrator.ts` | Position-specific pipeline |
| **scout9PipelineService** | `src/main/services/scout9PipelineService.ts` | Scout9 multi-step pipeline runner |
| **scout9Steps** | `src/main/services/scout9Steps.ts` | Pipeline step implementations |
| **matchSearchCoordinator** | `src/main/services/matchSearchCoordinator.ts` | Match confirmation management |

### External I/O Services

| Module | File | External Dependency |
|--------|------|-------------------|
| **voyageEmbeddingService** | `src/main/services/voyageEmbeddingService.ts` | Voyage AI API (embeddings) |
| **upstreamApiService** | `src/main/services/upstreamApiService.ts` | Internal Unosquare HR API |
| **catalogService** | `src/main/services/catalogService.ts` | Core catalogs API |
| **subscriptionService** | `src/main/services/subscriptionService.ts` | Claude CLI auth check |
| **databaseSharingService** | `src/main/services/databaseSharingService.ts` | SQLite DB export/import |

### IPC Handler Layer (21 Handler Files)

| IPC Handler | File | Test Coverage |
|-------------|------|--------------|
| `app.ipc.ts` | `src/main/ipc/app.ipc.ts` | ✅ Integration test |
| `scout9.ipc.ts` | `src/main/ipc/scout9.ipc.ts` | ✅ Integration test |
| `path.ipc.ts` | `src/main/ipc/path.ipc.ts` | ✅ Integration test |
| `oracle.ipc.ts` | `src/main/ipc/oracle.ipc.ts` | ❌ No test |
| `vigil.ipc.ts` | `src/main/ipc/vigil.ipc.ts` | ❌ No test |
| `braniac.ipc.ts` | `src/main/ipc/braniac.ipc.ts` | ❌ No test |
| `mail.ipc.ts` | `src/main/ipc/mail.ipc.ts` | ❌ No test |
| `nomicore.ipc.ts` | `src/main/ipc/nomicore.ipc.ts` | ❌ No test |
| `agentStub.ipc.ts` | `src/main/ipc/agentStub.ipc.ts` | ❌ No test |
| `bug.ipc.ts` | `src/main/ipc/bug.ipc.ts` | ❌ No test |
| `vem/match.ipc.ts` | `src/main/ipc/vem/match.ipc.ts` | ❌ No test |
| `vem/processing.ipc.ts` | `src/main/ipc/vem/processing.ipc.ts` | ❌ No test |
| `vem/sessions.ipc.ts` | `src/main/ipc/vem/sessions.ipc.ts` | ❌ No test |
| `vem/database.ipc.ts` | `src/main/ipc/vem/database.ipc.ts` | ❌ No test |
| `vem/ai.ipc.ts` | `src/main/ipc/vem/ai.ipc.ts` | ❌ No test |
| `vem/pipeline.ipc.ts` | `src/main/ipc/vem/pipeline.ipc.ts` | ❌ No test |
| `vem/positionPipeline.ipc.ts` | `src/main/ipc/vem/positionPipeline.ipc.ts` | ❌ No test |
| `vem/presentation.ipc.ts` | `src/main/ipc/vem/presentation.ipc.ts` | ❌ No test |
| `datasync/sync.ipc.ts` | `src/main/ipc/datasync/sync.ipc.ts` | ❌ No test |
| `prr/prr.ipc.ts` | `src/main/ipc/prr/prr.ipc.ts` | ❌ No test |
| `report/report.ipc.ts` | `src/main/ipc/report/report.ipc.ts` | ❌ No test |
| IPC infra (`registerIpcHandler`, `errorHandler`, `validate`, `schemas`) | `src/main/ipc/*.ts` | ✅ All tested |

### Database Repositories

| Repository | Database | Test Coverage |
|-----------|----------|--------------|
| `syncRepository` | nexus | ✅ |
| `matchRepository` | nexus | ✅ |
| `sessionRepository` | nexus | ✅ |
| `embeddingRepository` | nexus | ✅ |
| `prrRepository` | nexus | ✅ |
| `presentationRepository` | nexus | ❌ **No test** |
| Path repos (6) | path | ✅ All tested |
| `stakeholderProfileRepository` | agents | ✅ |
| `vigilRepository` | agents | ❌ **No test** |
| `oracleRepository` | agents | ❌ **No test** |
| `jobRepository` | agents | ❌ **No test** |
| `exchangeRateRepository` | agents | ❌ **No test** |
| `patternRepository` | agents | ❌ **No test** |
| `salaryBandRepository` | agents | ❌ **No test** |
| `reportRepository` | agents | ❌ **No test** |
| `knowledgeRepository` | agents | ❌ **No test** |
| `brainRepository` | agents | ❌ **No test** |
| `configRepository` | agents | ❌ **No test** |

---

## 3. Existing Tests Summary

| Category | Count | Notes |
|----------|-------|-------|
| Main process service unit tests | 39 files | `src/main/services/__tests__/` |
| Main process integration tests | 6 files | matchEngine, sync, processing, path, databaseSharing, prrSync.live |
| Repository tests (nexus) | 5 files | sync, match, session, embedding, prr |
| Repository tests (path) | 6 files | developer, admin, discussion, dossier, assessment, learningPath |
| Repository tests (agents) | 1 file | stakeholderProfile only |
| DB infra tests | 2 files | migrationRunner, nexusMigrations.integration |
| IPC infra tests | 4 files | registerIpcHandler, errorHandler, validate, schemas |
| IPC integration tests | 3 files | app, scout9, path |
| Renderer service tests | 27 files | resume (14) + datasync (4) + path (7) + agents (1) + command-center (1) |
| Renderer component tests | ~21 files | Various components across apps |
| Renderer hook tests | ~17 files | resume (11) + datasync (4) + command-center (2) |
| Shared utility tests | 4 files | reportError, rendererLogger, safeJsonParse, tokenUtils |
| Shared component tests | 6 files | Toast, ConfirmModal, EmptyState, ErrorBanner, StepperBar, ToastContext |
| Main process utility tests | 3 files | concurrency, upsertBuilder, aiResponseParser |
| E2E tests | 2 files | app.spec.ts, navigation.spec.ts |
| Other | 4 files | types/index.test.ts, escapeHtml.test.ts, useIpcQuery.test.ts, aether-flow-hero.test.tsx |
| **Total** | **150 test files** | |

---

## 4. Prioritized Test Plan

| Priority | Layer | Target (file/function/flow) | Risk if untested | Est. Tests |
|----------|-------|---------------------------|------------------|------------|
| **P0** | Unit | `scout9AgentService.ts` — agent SDK loop, tool dispatch, token tracking | Claude SDK agent loop is core IP; tool-use bugs silently corrupt results | 15 |
| **P0** | Unit | `scout9ChatService.ts` — chat flow, streaming chunks, brain assembly | Chat is user-facing; streaming bugs cause hangs or lost content | 12 |
| **P0** | Unit | `oracleChatService.ts` — SQL introspection, streaming, tool dispatch | SQL injection risk; untested safety checks | 12 |
| **P0** | Unit | `scout9McpServer.ts` — MCP tool registration, handler dispatch | Tool schema mismatches cause silent agent failures | 8 |
| **P0** | Unit | `oracleMcpServer.ts` — SQL safety validation, query tools | `isSafeQuery`, filter builders — SQL injection gateway | 10 |
| **P0** | Unit | `scout9Tools.ts` + `vigilTools.ts` — ToolCallTracker limits, tool definitions | Runaway tool loops without limits | 8 |
| **P1** | Unit | `agentNarrator.ts` — prompt building, fallback narration, normalization | Low narration quality degrades UX but no data risk | 6 |
| **P1** | Unit | `agentStepEmitter.ts` — step emission, status normalization | Missed steps in UI; low severity | 6 |
| **P1** | Unit | `scout9Steps.ts` — fetchPositions, gatherCandidates, crossReference | Pipeline step logic errors cascade to wrong match results | 10 |
| **P1** | Unit | `scout9PipelineService.ts` — pipeline orchestration, step sequencing | Step ordering bugs, signal handling | 8 |
| **P1** | Unit | `promptTemplates.ts` — template fill, constant integrity | Malformed prompts cause wrong AI outputs | 6 |
| **P1** | Unit | `utils/aiResponseParser.ts` — JSON extraction edge cases | Already tested; verify edge cases (malformed JSON, partial) | 4 |
| **P1** | Unit | `vigilScheduler.ts` — cron-like scheduling, tick logic, dedup | Missed or duplicate sync runs | 8 |
| **P1** | Unit | `braniacScheduler.ts` — trigger/cancel/status | Simple but untested | 4 |
| **P1** | Unit | `vigilExecutor.ts` — source sync, retry, cancel, status | Data sync failures not caught | 10 |
| **P1** | Unit | `vigilEventMapper.ts` + `vigilTokenStore.ts` — event mapping, token cache | Simple utilities; low risk but easy wins | 4 |
| **P1** | Unit | `unifiedPipelineOrchestrator.ts` — run, pause, retry orchestration | Pipeline hangs or data loss on pause/retry | 10 |
| **P1** | Unit | `positionPipelineOrchestrator.ts` — position-specific pipeline | Same risks as unified pipeline | 8 |
| **P2** | Unit | `subscriptionService.ts` — CLI check, auth validation | Auth bypass or false negatives block all AI features | 6 |
| **P2** | Unit | `agentStubExecutor.ts` — stub step simulation | Demo-only; low risk | 3 |
| **P2** | Unit | `dynamicContentService.ts` — resource search | Low complexity | 3 |
| **P2** | Unit | Agents DB repositories (10 untested) | Data access bugs in agent persistence | 20 |
| **P2** | Unit | `presentationRepository.ts` | Nexus DB data access gap | 4 |
| **P2** | Integration | `sync/` sub-orchestrators (candidate, employee, position) | Sync correctness for each entity type | 12 |
| **P2** | Integration | `sync/changeDetection.ts` + `embeddingEligibility.ts` | Wrong change detection → stale or redundant syncs | 6 |
| **P3** | Integration | IPC handlers without tests (18 handlers) | Handler registration, validation, error propagation | 36 |
| **P3** | E2E | Agent full journey (scout9 pipeline → results) | End-to-end correctness of agentic flow | 3 |
| **P3** | E2E | Match engine full journey (search → haiku → sonnet → session) | Match pipeline correctness | 2 |
| **P3** | Contract | Zod schemas in `schemas.ts` — fuzz inputs | Invalid payloads bypass validation | 8 |

**Total estimated new tests: ~246** (delivered across runs 2–9)

---

## 5. Implementation Runs

### Run 1: `focus: discovery` ✅ (this run)
- Created this discovery report as `tests/_meta/discovery.md`
- Created `tests/_meta/CHANGELOG.md`
- Created `tests/README.md` with run instructions

### Run 2: `focus: mocks` — Claude SDK Mock Harness
- `tests/_helpers/claudeMock.ts` — Three-mode `ScriptedClaudeClient`
- `tests/_helpers/agentFactory.ts` — Builder for agent instances with injected deps
- `tests/_helpers/cassette.ts` — Record/replay utilities
- `tests/_helpers/sandbox.ts` — Temp dir + mock isolation
- `tests/_helpers/mockLogger.ts` — Reusable mock logger factory
- `tests/_helpers/mockDb.ts` — In-memory better-sqlite3 factory

### Run 3: `focus: unit` — Core Agent Services (P0, ~55 tests)
- `scout9AgentService.test.ts` (15), `scout9ChatService.test.ts` (12)
- `oracleChatService.test.ts` (12), `scout9McpServer.test.ts` (8)
- `oracleMcpServer.test.ts` (10)

### Run 4: `focus: unit` — Tools, Pipelines, Schedulers (P1, ~60 tests)
- `vigilTools.test.ts` (8), `agentNarrator.test.ts` (6), `agentStepEmitter.test.ts` (6)
- `scout9Steps.test.ts` (10), `promptTemplates.test.ts` (6)
- `vigilScheduler.test.ts` (8), `braniacScheduler.test.ts` (4)
- `vigilExecutor.test.ts` (10), `vigilEventMapper.test.ts` (2), `vigilTokenStore.test.ts` (2)

### Run 5: `focus: unit` — Orchestrators, Remaining Services (~40 tests)
- `unifiedPipelineOrchestrator.test.ts` (10), `positionPipelineOrchestrator.test.ts` (8)
- `subscriptionService.test.ts` (6), `agentStubExecutor.test.ts` (3), `dynamicContentService.test.ts` (3)
- Agents DB repos (10 × 2 = 20 tests)

### Run 6: `focus: integration` — IPC Handlers + Sync Sub-Orchestrators (~40 tests)
- IPC handler integration tests for untested handlers
- Sync sub-orchestrator tests (candidate, employee, position)
- `changeDetection.test.ts`, `embeddingEligibility.test.ts`

### Run 7: `focus: edge_cases` (~25 tests)
- Edge case test file covering: empty inputs, large payloads, malformed JSON,
  SQL injection bypass attempts, abort signals, ToolCallTracker limits, multi-byte chars

### Run 8: `focus: e2e` — Cassette-Based E2E
- `e2e/scout9-pipeline.spec.ts`, `e2e/match-engine-flow.spec.ts`
- `tests/cassettes/` directory structure

### Run 9: `focus: regression` — Contract Tests (~15 tests)
- `schemas.contract.test.ts` — Fuzz all Zod schemas, round-trip serialization

---

## 6. Output Structure

```
tests/
├── _meta/
│   ├── discovery.md          ← This file
│   └── CHANGELOG.md          ← Run-by-run changelog
├── _helpers/
│   ├── claudeMock.ts         # Three-mode Claude SDK mock (Run 2)
│   ├── agentFactory.ts       # Agent instance builder (Run 2)
│   ├── cassette.ts           # Record/replay utilities (Run 2)
│   ├── sandbox.ts            # Temp dir + isolation (Run 2)
│   ├── mockLogger.ts         # Reusable logger mock (Run 2)
│   └── mockDb.ts             # In-memory SQLite factory (Run 2)
├── cassettes/                # E2E response cassettes (Run 8)
│   └── .gitkeep
└── README.md                 ← Run instructions
```

New test files follow existing conventions:
- `__tests__/*.test.ts` for main process services
- Colocated `*.test.ts` / `*.test.tsx` for renderer

---

## 7. Summary

```
=== TEST GENERATION RUN SUMMARY ===
Run focus: discovery
Discovery updated: yes (initial creation)
New test files: 0 (discovery only)
New test cases: 0 (discovery only)
Existing test files: 150
Coverage thresholds: stmt 25% / branch 20% / func 25% / lines 25%
All tests passing: N/A (discovery only)
Cassettes added: 0
Remaining high-risk gaps:
  - scout9AgentService (0% coverage — core agentic loop)
  - scout9ChatService (0% coverage — user-facing chat)
  - oracleChatService (0% coverage — SQL safety)
  - oracleMcpServer (0% coverage — SQL injection surface)
  - 10 agents DB repositories (0% coverage)
  - 18 IPC handlers (0% coverage)
  - unifiedPipelineOrchestrator (0% coverage)
  - positionPipelineOrchestrator (0% coverage)
  - vigilExecutor/Scheduler (0% coverage)
  - presentationRepository (0% coverage)
Recommended next run focus: mocks
===================================
```
