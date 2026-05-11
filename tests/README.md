# Operation Nexus — Test Suite

## Quick Start

```bash
# Run all tests
npx vitest run

# Run with coverage report
npx vitest run --coverage

# Run specific project
npx vitest run --project main
npx vitest run --project renderer

# Run a specific test file
npx vitest run src/main/services/__tests__/scout9AgentService.test.ts

# Run tests in watch mode
npx vitest --project main
```

## Test Projects

The test suite is split into two Vitest projects (configured in `vitest.config.ts`):

| Project | Environment | Scope | Setup |
|---------|-------------|-------|-------|
| `main` | `node` | `src/main/**/*.test.ts` | None |
| `renderer` | `jsdom` | `src/renderer/**/*.test.{ts,tsx}` | `src/renderer/test-setup.ts` |

## Coverage

Coverage uses the `v8` provider with thresholds:

| Metric | Threshold |
|--------|-----------|
| Statements | 25% |
| Branches | 20% |
| Functions | 25% |
| Lines | 25% |

```bash
# Generate coverage report (HTML + text + lcov)
npx vitest run --coverage

# View HTML report
open coverage/index.html
```

## Test File Conventions

| Location | Pattern | Example |
|----------|---------|---------|
| Main services | `src/main/services/__tests__/*.test.ts` | `claudeService.test.ts` |
| Main integration | `src/main/services/__tests__/*.integration.test.ts` | `matchEngineService.integration.test.ts` |
| Repositories | `src/main/db/repositories/__tests__/*.test.ts` | `syncRepository.test.ts` |
| IPC handlers | `src/main/ipc/__tests__/*.integration.test.ts` | `scout9.ipc.integration.test.ts` |
| IPC infra | `src/main/ipc/*.test.ts` | `validate.test.ts` |
| Renderer services | `src/renderer/apps/*/services/*.test.ts` | `matchEngineService.test.ts` |
| Renderer components | `src/renderer/apps/*/components/**/*.test.tsx` | `ScopeSelector.test.tsx` |
| Renderer hooks | `src/renderer/apps/*/hooks/*.test.ts` | `useMatchEngine.test.ts` |
| Shared utilities | `src/renderer/shared/utils/*.test.ts` | `safeJsonParse.test.ts` |
| E2E | `e2e/*.spec.ts` | `app.spec.ts` |

## Mock Modes

Test helpers in `tests/_helpers/` support three mock modes for Claude SDK interactions:

| Mode | Env Variable | Use Case |
|------|-------------|----------|
| **Scripted** (default) | `CLAUDE_MOCK_MODE=scripted` | Deterministic — fast CI, predictable |
| **Replay** | `CLAUDE_MOCK_MODE=replay` | Cassette-based — realistic sequences |
| **Live** | `CLAUDE_LIVE_TESTS=1` | Real SDK calls — nightly/integration only |

```bash
# Default: scripted mocks (fastest, CI-safe)
npx vitest run

# Cassette replay mode
CLAUDE_MOCK_MODE=replay npx vitest run

# Live SDK (requires API key, nightly only)
CLAUDE_LIVE_TESTS=1 npx vitest run
```

## E2E Tests (Playwright)

E2E tests use Playwright to launch the Electron app and connect via CDP:

```bash
# Run E2E tests
npx playwright test

# Run with headed browser
npx playwright test --headed

# Run specific E2E spec
npx playwright test e2e/app.spec.ts
```

## Directory Structure

```
tests/
├── _meta/
│   ├── discovery.md       # Architecture map + gap analysis
│   └── CHANGELOG.md       # Run-by-run progress log
├── _helpers/              # Shared test utilities (created in Run 2)
│   ├── claudeMock.ts      # Three-mode Claude SDK mock
│   ├── agentFactory.ts    # Agent instance builder
│   ├── cassette.ts        # Record/replay utilities
│   ├── sandbox.ts         # Temp dir + isolation
│   ├── mockLogger.ts      # Reusable logger mock
│   └── mockDb.ts          # In-memory SQLite factory
├── cassettes/             # E2E response cassettes
│   └── .gitkeep
└── README.md              # This file

# Test files are colocated with source code:
src/main/services/__tests__/     # Main process unit + integration tests
src/main/db/repositories/__tests__/ # Repository tests
src/main/ipc/__tests__/          # IPC handler integration tests
src/renderer/apps/*/             # Renderer tests (colocated)
e2e/                             # Playwright E2E specs
```

## Test Generation Plan

This test suite is being built incrementally across 9 runs. See `tests/_meta/discovery.md` for the full plan and `tests/_meta/CHANGELOG.md` for progress.

| Run | Focus | Status |
|-----|-------|--------|
| 1 | Discovery | ✅ Complete |
| 2 | Mock harness | ✅ Complete |
| 3 | Non-agent unit tests (P1-P2) | ✅ Complete — 14 files, 120 tests |
| 4 | Core agent services (P0) | ⬜ Pending |
| 5 | Orchestrators, remaining services | ⬜ Pending |
| 6 | IPC handlers + sync sub-orchestrators | ⬜ Pending |
| 7 | Edge cases | ⬜ Pending |
| 8 | Cassette-based E2E | ⬜ Pending |
| 9 | Contract/regression tests | ⬜ Pending |
