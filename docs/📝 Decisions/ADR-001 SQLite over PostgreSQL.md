---
status: accepted
date: 2026-02-13
tags: [adr, database]
---

# ADR-001: SQLite over PostgreSQL

## Context

Operation Nexus is a desktop-first Electron application that needs to store candidate data, match results, session history, and vector embeddings. The two main database options considered were:

1. **PostgreSQL** — Full-featured relational database with pgvector for embeddings
2. **SQLite** — Embedded database with sqlite-vec for vector search

The application is designed for internal use by recruiters and staffing managers, running on individual machines rather than as a shared web service.

## Decision

We chose **SQLite** (`better-sqlite3`) with the `sqlite-vec` extension for all data storage.

**Reasons:**
- **Zero infrastructure** — No database server to install, configure, or maintain
- **Portable** — Database files live in the user's app data directory
- **Offline-capable** — Works without network access
- **Fast** — Synchronous reads, no network latency for queries
- **Shareable** — Database files can be exported/imported between users
- **sqlite-vec** — Provides vector similarity search comparable to pgvector for our scale

## Consequences

**Easier:**
- Development setup is trivial — just run the app
- No Docker, no database migrations infrastructure (beyond file-based SQL migrations)
- Database sharing between team members via export/import
- Offline functionality works out of the box

**Harder:**
- No concurrent write access from multiple processes (acceptable for desktop app)
- Vector search performance may not scale to millions of rows (acceptable for our use case of ~10K candidates)
- No built-in replication or backup (mitigated by export/import feature)
- Schema migrations need careful handling (mitigated by shared `migrationRunner.ts`)

## Related
- [[Database Schema]]
- [[System Overview]]
