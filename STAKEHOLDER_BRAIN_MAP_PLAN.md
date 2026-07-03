# Stakeholder Brain Map & Pattern Inference — Implementation Plan

> **Goal**: Make Scout self-aware of all candidates/employees so it can answer questions like _"Which candidates are good for this Axos Senior .NET position?"_ by applying inferred rules (salary bands, stakeholder preferences, seniority flexibility) learned from historical accept/reject patterns.

---

## Phase 1 — Data Foundation

### 1.1 Salary Bands Reference Table
**Database**: `agents.db`  
**What**: New `salary_bands` table with country/seniority/employment-type rate ranges in USD/hr.

```sql
CREATE TABLE IF NOT EXISTS salary_bands (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  country TEXT NOT NULL,
  seniority TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'FTE' CHECK (employment_type IN ('FTE', 'Contractor')),
  min_rate_usd REAL NOT NULL,
  max_rate_usd REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (country, seniority, employment_type)
);
```

**Seed data**: Manual entry from COE knowledge (MX, CO, BOL, PRY, UK, US bands).  
**Future**: Inference engine can propose adjustments based on observed accepted rates.

**Files to change**:
- `src/main/db/agents/migrations/005_salary_bands.sql` — migration
- `src/main/db/agents/schema.sql` — add table DDL
- `src/main/db/agents/repositories/salaryBandRepository.ts` — CRUD
- `src/main/ipc/scout9.ipc.ts` — expose IPC channels for dashboard management
- `src/shared/ipc-channels.ts` — new channel constants

---

### 1.2 Salary Data Normalization Utility
**What**: A service that normalizes all salary fields to USD/hr for comparison.

**Current state of salary data**:
| Source | Field | Unit | Currency |
|--------|-------|------|----------|
| `synced_candidates` | `salary_expectations` | Unknown (monthly?) | `salary_expectations_currency` |
| `synced_candidates` | `current_salary` | Unknown | `salary_currency` |
| `synced_employees` | `gross_monthly_salary` | Monthly | `salary_currency` |
| `synced_employees` | `rate` | Hourly (assumed USD) | No currency field |
| `open_position_candidates` | `rate` | Hourly USD | Implicit |
| `synced_open_positions` | `minimum_rate` / `maximum_rate` | Hourly USD | Implicit |

**Needs**:
- Exchange rate reference (static table or simple config — COP, MXN, PYG, BOB → USD)
- Monthly → hourly conversion factor (÷ 160 standard hours)
- A function: `normalizeToUsdHr(amount, currency, period) → number`

**Files to create**:
- `src/main/services/salaryNormalizationService.ts`
- `src/main/services/__tests__/salaryNormalizationService.test.ts`

**Open decision**: Do we also add a denormalized `rate_usd_hr` column to `synced_candidates` / `synced_employees` computed at sync time? Pros: fast queries. Cons: stale if exchange rates change.

---

### 1.3 Feedback Catalog Persistence
**What**: Store the feedback catalog labels locally so the inference engine can resolve feedback IDs without a live API token.

**Current state**: `rejection_feedback` is stored as raw numeric IDs (e.g., `[0, 4]`). Labels like "Technical Skill" are resolved at runtime from `catalogService.getCandidatePositionFeedbacks()` which requires a token.

**Approach**: New reference table in `nexus.db`:

```sql
CREATE TABLE IF NOT EXISTS feedback_catalog (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
```

Populated during sync from the catalog API. Inference engine joins against this table.

**Files to change**:
- `src/main/db/migrations/009_feedback_catalog.sql` — migration (next available number)
- `src/main/db/schema.sql` — add table DDL
- `src/main/db/repositories/syncRepository.ts` — add upsert method
- `src/main/services/sync/syncOpenPositionOrchestrator.ts` — sync catalog during position sync

---

## Phase 2 — Sync Enrichment

### 2.1 Historical Open Position Sync
**What**: A separate sync action that fetches ALL positions (active + closed/filled/canceled) from the upstream API.

**Current state**: `getOpenPositionsPaged()` calls `op/paged/true/1/` — the `true` parameter likely filters to active positions only.

**Changes needed**:

1. **Upstream API**: New method or parameter:
   ```ts
   // Option A: new method
   async getOpenPositionsPagedAll(token, skip, take)
   // Calls: op/paged/false/1/ (or whatever returns all statuses)
   
   // Option B: parameter on existing method
   async getOpenPositionsPaged(token, skip, take, activeOnly = true)
   ```

2. **New orchestrator or mode**: `syncOpenPositionOrchestrator.ts` gets an `includeHistorical` option, or we create `syncHistoricalPositionOrchestrator.ts` as a separate orchestrator.

3. **Separate UI button**: "Sync Historical Positions" in DataSync page — clearly labeled as a heavy operation.

4. **Rate limiting**: Historical sync could be thousands of positions. Need throttling on the detail + candidates + discussions calls.

**Files to change**:
- `src/main/services/upstreamApiService.ts` — add `activeOnly` parameter
- `src/main/services/sync/syncOpenPositionOrchestrator.ts` — support historical mode
- `src/main/ipc/sync.ipc.ts` — new IPC channel or option
- `src/shared/ipc-channels.ts` — channel constant
- `src/renderer/apps/resume/pages/DataSyncPage.tsx` — UI button

**⚠️ Validation needed**: Confirm the upstream API supports fetching closed positions. Test `op/paged/false/1/` manually first.

---

### 2.2 Expand Candidate Detail Capture to All Statuses
**What**: Fetch `CandidateRequisitionDetail` for ALL presented candidates, not just `RejectedByClient`.

**Current state** (line 112 of `syncOpenPositionOrchestrator.ts`):
```ts
const rejectedCandidates = candidates.filter(c => c.candidateStatusName === 'RejectedByClient')
```

**Change to**:
```ts
// Fetch detail for all presented candidates (accepted, rejected, withdrawn, etc.)
for (const candidate of candidates) {
  const detail = await upstreamApiService.getCandidateRequisitionDetail(token, candidate.candidateRequisitionId)
  if (detail) {
    matchRepository.updateCandidateDetails(positionId, candidate.candidateRequisitionId, {
      feedback: JSON.stringify(detail.listFeedback ?? []),
      comments: detail.comments ?? '',
      action_date: detail.actionDate || null,
      requisition_status_id: detail.requisitionStatusId,
    })
  }
}
```

**Schema change**: Rename `rejection_*` columns to generic `candidate_*` columns (or add new ones alongside):
```sql
ALTER TABLE open_position_candidates ADD COLUMN feedback TEXT NOT NULL DEFAULT '[]';
ALTER TABLE open_position_candidates ADD COLUMN comments TEXT NOT NULL DEFAULT '';
ALTER TABLE open_position_candidates ADD COLUMN action_date TEXT;
ALTER TABLE open_position_candidates ADD COLUMN requisition_status_id INTEGER;
```

**Files to change**:
- `src/main/db/migrations/010_candidate_full_details.sql`
- `src/main/db/schema.sql`
- `src/main/db/repositories/matchRepository.ts` — new update method
- `src/main/services/sync/syncOpenPositionOrchestrator.ts` — expand loop
- Consider rate limiting (add small delay between detail calls)

---

## Phase 3 — Intelligence Engine

### 3.1 Stakeholder Profile Table
**Database**: `agents.db`  
**What**: Structured table to persist the "brain map" per stakeholder/account.

```sql
CREATE TABLE IF NOT EXISTS stakeholder_profiles (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  stakeholder_name TEXT NOT NULL,
  account TEXT NOT NULL,
  -- Rate intelligence
  observed_rate_floor REAL,
  observed_rate_ceiling REAL,
  avg_accepted_rate REAL,
  -- Geography intelligence
  accepted_countries TEXT NOT NULL DEFAULT '[]',   -- JSON array
  rejected_countries TEXT NOT NULL DEFAULT '[]',   -- JSON array
  untested_countries TEXT NOT NULL DEFAULT '[]',   -- JSON array
  -- Seniority intelligence
  seniority_flexibility INTEGER NOT NULL DEFAULT 0, -- -1, 0, +1
  posted_seniorities TEXT NOT NULL DEFAULT '[]',
  accepted_seniorities TEXT NOT NULL DEFAULT '[]',
  -- Behavioral intelligence
  avg_time_to_decision_days REAL,
  top_rejection_reasons TEXT NOT NULL DEFAULT '[]', -- JSON array of {reason, count}
  top_acceptance_signals TEXT NOT NULL DEFAULT '[]',
  -- Meta
  preference_summary TEXT NOT NULL DEFAULT '',      -- markdown from Claude analysis
  data_points_count INTEGER NOT NULL DEFAULT 0,
  confidence_score REAL NOT NULL DEFAULT 0,
  last_inference_job_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (stakeholder_name, account),
  FOREIGN KEY (last_inference_job_id) REFERENCES agent_jobs(id) ON DELETE SET NULL
);
```

**Files to create**:
- `src/main/db/agents/migrations/006_stakeholder_profiles.sql`
- `src/main/db/agents/repositories/stakeholderProfileRepository.ts`

---

### 3.2 Pattern Inference Agent
**What**: A new agent (following Vigil's architecture) that analyzes historical data and produces stakeholder profiles + learned patterns.

**Job flow**:
```
1. Trigger: Manual ("Analyze Axos") or scheduled (weekly for all accounts)
2. Data aggregation: Query nexus.db for all positions + candidates + outcomes for target account/stakeholder
3. Enrichment: Join with salary bands, feedback catalog, salary normalization
4. Claude analysis: Send structured data to Claude with inference prompt
5. Output: Update stakeholder_profiles + create/update learned_patterns + generate brain_snapshot
```

**Inference prompt structure**:
```
You are analyzing hiring patterns for {account} / stakeholder {stakeholder_name}.

Here are all positions (N total, M filled, K open, J canceled):
[structured position data with candidates, outcomes, rates, feedback]

Here are the salary bands for reference:
[salary bands table]

Analyze and output:
1. Rate patterns (observed floor/ceiling, sweet spot)
2. Country preferences (accepted vs rejected vs untested)
3. Seniority flexibility (do they accept -1 seniority? evidence?)
4. Top rejection reasons with frequency
5. Top acceptance signals
6. Any other behavioral patterns
7. Confidence score (0-1) based on sample size
8. Natural language summary for Scout's context
```

**Files to create**:
- `src/main/services/inferenceAgent.ts` — core agent logic
- `src/main/services/inferenceDataAggregator.ts` — cross-DB query aggregation
- `src/main/services/__tests__/inferenceAgent.test.ts`
- `src/main/services/__tests__/inferenceDataAggregator.test.ts`

**Files to change**:
- `src/main/ipc/scout9.ipc.ts` — IPC channels for triggering inference jobs
- `src/shared/ipc-channels.ts` — new channel constants

---

### 3.3 Client Rule Overrides Integration
**What**: Connect the inference engine output to the existing `client_rule_overrides` table.

**Current state**: The `client_rule_overrides` table exists in agents.db but is empty — it's designed for per-client rule customization with `client_id` + `rule_id` + `override_text`.

**Integration**: When the inference engine detects an account-specific pattern (e.g., "Axos accepts seniority -1"), it creates:
1. A `learned_pattern` with the raw observation
2. After human approval, a `knowledge_rule` for the general principle
3. A `client_rule_override` for the account-specific application

---

## Phase 4 — Scout Integration

### 4.1 Scout Brain Context Loading
**What**: When Scout receives a query about candidates for a position, it automatically loads relevant intelligence into its context.

**Flow**:
```
User: "Who's good for this Axos Senior .NET position?"
  ↓
Scout identifies: account=Axos, stakeholder=Oscar Hernandez
  ↓
Loads: stakeholder_profile for Oscar/Axos
       + active knowledge_rules
       + client_rule_overrides for Axos
       + salary_bands for relevant countries
  ↓
Injects into system prompt / tool context
  ↓
Scout filters candidates using rules + math
  ↓
Returns ranked recommendations with reasoning
```

**Files to change**:
- Scout's chat service (system prompt construction)
- Scout's tool definitions (new tools for querying stakeholder profiles, salary bands)

---

### 4.2 Dashboard UI — Rule Management
**What**: Admin UI for managing salary bands, reviewing inferred patterns, and viewing stakeholder brain maps.

**Pages/Components**:
1. **Salary Bands Manager** — CRUD table for salary bands by country/seniority
2. **Pattern Review Queue** — List of inferred patterns with approve/reject/edit actions
3. **Stakeholder Brain Map** — Visual profile per stakeholder showing preferences, rates, geography
4. **Rule Overrides** — Per-client rule customization

**Location**: New section in `AdminDashboard` or a dedicated page under `/resume/intelligence`.

---

## Dependency Graph

```
Phase 1 (Data Foundation)
├── 1.1 Salary Bands Table ─────────────────────────┐
├── 1.2 Salary Normalization Utility ────────────────┤
└── 1.3 Feedback Catalog Persistence ────────────────┤
                                                     │
Phase 2 (Sync Enrichment)                            │
├── 2.1 Historical Position Sync ────────────────────┤
└── 2.2 Expand Candidate Detail Capture ─────────────┤
                                                     ▼
Phase 3 (Intelligence Engine)
├── 3.1 Stakeholder Profile Table ───────────────────┐
├── 3.2 Pattern Inference Agent ─────────────────────┤
└── 3.3 Client Rule Overrides Integration ───────────┤
                                                     ▼
Phase 4 (Scout Integration)
├── 4.1 Scout Brain Context Loading
└── 4.2 Dashboard UI
```

## Open Questions

1. **Upstream API**: Does `op/paged/false/1/` return historical/closed positions? Need manual verification.
2. **Exchange rates**: Static table vs. API? For internal COE decisions, static rates updated quarterly may suffice.
3. **Denormalized rate column**: Compute `rate_usd_hr` at sync time on candidates/employees, or normalize at query time?
4. **Inference trigger**: Manual per-account, or batch all accounts on a schedule?
5. **Pattern approval flow**: Auto-apply high-confidence patterns (>0.9 with 15+ data points) or always require human review?
6. **Separate agent vs. Scout sub-job**: Follow Vigil architecture (separate executor/scheduler) or integrate into Scout's existing job system?
