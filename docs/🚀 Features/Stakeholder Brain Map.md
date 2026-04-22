---
status: in-progress
priority: critical
requested: 2026-04-10
completed: 
tags: [feature, stakeholder, ai]
---

# Feature: Stakeholder Brain Map

## Summary
An AI-powered stakeholder relationship intelligence system that maps key contacts, their preferences, communication history, and relationship dynamics. Enables proactive relationship management and context-aware interactions.

## Motivation
Understanding stakeholder relationships is critical for successful staffing and project delivery. Currently this knowledge lives in people's heads and email threads. The Brain Map centralizes this intelligence and makes it actionable.

## Acceptance Criteria
- [ ] Database schema for stakeholder entities and relationships
- [ ] IPC channels for CRUD operations
- [ ] Entity graph visualization
- [ ] AI-generated relationship insights
- [ ] Integration with match engine for context-aware matching
- [ ] Search and filter capabilities

## Technical Notes
- **Database**: New tables in `nexus.db` — stakeholders, relationships, interactions, notes
- **IPC Channels**: New `brain:*` or `stakeholder:*` domain
- **Services**: New `brainMapService.ts` in main process
- **UI**: New page under `/resume/brain-map` or as a hub-level app

## Related
- [[Roadmap]]
- [[Match Engine]]
- [[Agent Architecture]]
- [[Scout9 Agent]]

## Progress Log
| Date | Update |
|------|--------|
| 2026-04-10 | Feature requested |
| 2026-04-16 | Started Phase 1 — DB schema design |
| 2026-04-21 | Entity relationship model in progress |
