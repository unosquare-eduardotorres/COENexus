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
