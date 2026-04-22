# 🔮 Operation Nexus — Documentation Vault

Welcome to the **Operation Nexus** Obsidian documentation vault. This folder serves as both version-controlled project documentation and a fully functional [Obsidian](https://obsidian.md) vault.

## Quick Navigation

### 📋 Project Management
- [[Roadmap]] — High-level feature roadmap with status tracking
- [[Backlog]] — Feature requests & ideas (Kanban-friendly)
- [[Sprint Log]] — Current sprint items & progress
- [[Changelog]] — Completed features by date

### 🚀 Features
- [[Match Engine]] — Candidate-to-opportunity matching
- [[Bench Burn Flow]] — Bench employee matching to open positions
- [[Data Sync Pipeline]] — Upstream HR system integration
- [[Stakeholder Brain Map]] — Stakeholder relationship intelligence
- [[Scout9 Agent]] — AI agent for candidate scouting

### 🏗️ Architecture
- [[System Overview]] — High-level architecture & tech stack
- [[IPC Channel Map]] — Electron IPC channel reference
- [[Database Schema]] — SQLite schema documentation
- [[Multi-App Hub Pattern]] — Hub-and-spoke app architecture
- [[Agent Architecture]] — AI agent system design

### 📝 Decisions
- [[ADR-001 SQLite over PostgreSQL]]
- [[ADR-002 Glassmorphism Design System]]

### 🔧 Guides
- [[Development Setup]] — Getting started for new developers
- [[Adding a New IPC Channel]] — Step-by-step IPC guide
- [[Creating a New App Route]] — Adding pages to the hub
- [[Testing Guide]] — Vitest + Playwright patterns

---

## How to Use This Vault

1. **Open Obsidian** → "Open folder as vault" → select this `docs/` folder
2. **Install plugins**: Kanban, Dataview, Templater (see [[#Recommended Plugins]])
3. **Create new features**: Use `_Template - Feature.md` via Templater
4. **Track progress**: Update frontmatter `status` fields and the [[Roadmap]]

## Recommended Plugins

| Plugin | Purpose |
|--------|---------|
| **Kanban** | Drag-and-drop board from `Backlog.md` |
| **Dataview** | Query vault like a database |
| **Templater** | Auto-fill templates with dates/titles |
| **Calendar** | Daily notes for standup logs |
| **Git** (obsidian-git) | Auto-commit from within Obsidian |

## Dataview Dashboards

### All In-Progress Features
```dataview
TABLE priority, requested
FROM "🚀 Features"
WHERE status = "in-progress"
SORT priority DESC
```

### Completed Features
```dataview
TABLE status, completed
FROM "🚀 Features"
WHERE status = "done"
SORT completed DESC
```

---

> **Tip**: This vault is tracked in Git alongside the codebase. Commit `docs/` changes with your code commits to keep documentation in sync.
