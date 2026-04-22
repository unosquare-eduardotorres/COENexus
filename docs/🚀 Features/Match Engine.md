---
status: done
priority: critical
requested: 2026-02-15
completed: 2026-03-15
tags: [feature, matching, ai]
---

# Feature: Match Engine

## Summary
AI-powered candidate-to-opportunity matching system using vector embeddings (Voyage AI) for semantic similarity and Claude models for intelligent scoring. Supports four distinct flows: Standard Match, Bench Burn, Delivery-to-Op, and External Candidate-to-Op.

## Motivation
Manual candidate-to-position matching is time-consuming and inconsistent. The match engine automates this with semantic understanding of skills, experience, and job requirements, providing objective scoring and gap analysis.

## Acceptance Criteria
- [x] Vector embedding generation via Voyage AI (`voyage-4-large`)
- [x] Semantic similarity search using `sqlite-vec`
- [x] Two-phase scoring: Haiku for fast filtering, Sonnet for deep analysis
- [x] Match session persistence and history
- [x] Pipeline progress streaming to renderer
- [x] Pool counts and statistics display
- [x] Gap analysis and fit verdict generation

## Technical Notes
- **IPC Channels**: `match:*` domain (~20 channels)
- **Services**: `matchEngineService.ts`, `matchSearchCoordinator.ts`, `voyageEmbeddingService.ts`, `claudeProxyService.ts`
- **DB Tables**: `match_sessions`, `resume_embeddings`, `open_position_candidates`
- **Pages**: `MatchEnginePage`, `BenchBurnPage`, `DeliveryToOpPage`, `ExternalCandidateToOpPage`

## Related
- [[Roadmap]]
- [[Bench Burn Flow]]
- [[Data Sync Pipeline]]
- [[Database Schema]]
- [[IPC Channel Map]]

## Progress Log
| Date | Update |
|------|--------|
| 2026-02-15 | Feature requested |
| 2026-02-25 | Voyage embedding integration complete |
| 2026-03-05 | Two-phase scoring pipeline working |
| 2026-03-10 | Session persistence and history |
| 2026-03-15 | ✅ All flows complete and tested |
