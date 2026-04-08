# CLAUDE.md - Operation Nexus

This file provides guidance to Claude Code (claude.ai/code) when working with this project.

## Project Overview

**Name**: Operation Nexus (COE Operation Nexus)  
**Description**: A desktop-first internal tool for resume transformation, candidate-to-opportunity matching (via vector embeddings + AI scoring), data synchronization from upstream HR systems, and batch processing. Built as a multi-app hub with a React renderer and Node.js services in Electron main process.  
**Author**: Unosquare  
**Created**: 2026-02-13T23:16:25.301Z

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | **Electron 40.0.x** (Chromium 144, Node 24) |
| Build Tool | **electron-vite 4.x** (main/preload/renderer builds) |
| Frontend | **React 19.2.x** + TypeScript |
| Styling | **Tailwind CSS** with custom glassmorphism design system |
| Main Process Services | **Node.js TypeScript modules** in `src/main/services/` |
| Database | **SQLite** (`better-sqlite3 12.8+`) + `sqlite-vec` |
| ORM/Access | **Drizzle ORM** or raw `better-sqlite3` for perf-critical queries |
| Packaging | **Electron Forge 7.x** |
| Testing | **Vitest** (renderer + node services) |
| Router | **HashRouter** (`file://` compatible) |
| Linting | **ESLint** |

## Project Structure

```
COE Operation Nexus/
├── src/
│   ├── main/                     # Electron main process (Node.js environment)
│   │   ├── index.ts              # App lifecycle, window creation, DB init
│   │   ├── ipc/                  # IPC handler registrations (by domain)
│   │   │   ├── index.ts          # registerAllHandlers()
│   │   │   ├── sync.ipc.ts       # sync:* channels
│   │   │   ├── match.ipc.ts      # match:* channels
│   │   │   ├── processing.ipc.ts # processing:* channels
│   │   │   ├── sessions.ipc.ts   # sessions:* channels
│   │   │   └── database.ipc.ts   # database:* channels
│   │   ├── services/             # Business logic
│   │   │   ├── upstreamApiService.ts
│   │   │   ├── catalogService.ts
│   │   │   ├── voyageEmbeddingService.ts
│   │   │   ├── claudeProxyService.ts
│   │   │   ├── matchEngineService.ts
│   │   │   ├── matchSearchCoordinator.ts
│   │   │   ├── syncOrchestrator.ts
│   │   │   ├── processingOrchestrator.ts
│   │   │   ├── resumeTextExtractor.ts
│   │   │   ├── resumeSessionVectorizer.ts
│   │   │   ├── embeddingJobQueue.ts
│   │   │   ├── benchBurnService.ts
│   │   │   └── databaseSharingService.ts
│   │   ├── db/                   # SQLite database layer
│   │   │   ├── connection.ts     # better-sqlite3 + sqlite-vec init
│   │   │   ├── schema.sql        # DDL + sqlite-vec virtual tables
│   │   │   ├── migrations/       # Versioned SQL migration files
│   │   │   └── repositories/     # Data access per entity
│   │   ├── config.ts             # App config (JSON in userData)
│   │   ├── menu.ts               # Native menu
│   │   └── updater.ts            # Auto-update logic
│   ├── preload/
│   │   └── index.ts              # typed contextBridge API
│   ├── renderer/                 # React app
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx               # HashRouter root
│   │   ├── index.css             # Glassmorphism design system
│   │   ├── hub/
│   │   ├── apps/resume/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── services/         # window.api.* IPC service layer
│   │   │   ├── types/index.ts
│   │   │   ├── data/
│   │   │   └── utils/
│   │   ├── components/
│   │   └── contexts/             # ThemeContext
│   └── shared/
│       ├── ipc-channels.ts       # channel constants
│       └── types.ts              # shared interfaces + window.api types
├── resources/                    # App icons and platform assets
├── scripts/
│   └── migrate-pg-to-sqlite.ts   # one-time migration reference script
├── electron.vite.config.ts
├── forge.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vitest.config.ts
```

**IMPORTANT**: Do NOT run `npm install` or `npm ci` or `npm build` commands. When you need to add dependencies, modify the `package.json` file directly. The preview service automatically installs dependencies when you view the application.

**IMPORTANT - Documentation Files**:
- Do NOT create README.md, CHANGELOG.md, CONTRIBUTING.md, or any other documentation files in the root directory unless explicitly requested by the user
- Do NOT create markdown files summarizing work completed, listing changes, or documenting features after finishing tasks
- Only create documentation files when the user specifically asks for documentation
- If you need to communicate changes or completion status, output the information directly to the user rather than creating a file

## Multi-App Architecture

The app is structured as a **hub-and-spoke** pattern:

- **`/`** → `NexusLanding` — Hub landing page with app cards
- **`/resume/*`** → `ResumeApp` — Full resume processing sub-application

### Resume App Routes (inside `/resume/`)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `HomePage` | Dashboard / entry point |
| `/enhance` | `TransformPage` | AI-powered resume transformation |
| `/history` | `TransformHistoryPage` | Past transform sessions |
| `/match` | `MatchEnginePage` | Candidate-to-opportunity matching |
| `/batch` | `BatchPage` | Batch resume processing |
| `/data-sync` | `DataSyncPage` | Sync data from upstream HR systems |
| `/review` | `RecruiterDashboard` | Resume review and editing |
| `/settings` | `AdminDashboard` | Admin settings, database sharing |

### Match Engine Flows

The match engine supports four distinct flows:
1. **Standard Match** (`MatchEnginePage`) — Match synced candidates to a job description
2. **Bench Burn** (`BenchBurnPage`) — Match bench employees to open positions
3. **Delivery-to-Op** (`DeliveryToOpPage`) — Match delivery employees to opportunities
4. **External Candidate-to-Op** (`ExternalCandidateToOpPage`) — Upload external resumes and match to positions

## Backend API (Electron Main Process IPC)

All backend capabilities are implemented as Node.js services in Electron main process and exposed to the renderer via typed IPC channels.

### IPC Handler Domains

| IPC Domain | Main Handler | Responsibility |
|------------|--------------|----------------|
| `sync:*` | `sync.ipc.ts` | Token validation, data sync from upstream HR systems |
| `processing:*` | `processing.ipc.ts` | Resume text extraction and vectorization pipeline |
| `match:*` | `match.ipc.ts` | Match engine search, sessions, bench burn, pool counts |
| `database:*` | `database.ipc.ts` | Database sharing/export/import workflows |
| `sessions:*` | `sessions.ipc.ts` | Transform session persistence and retrieval |

### External Dependencies

- **Upstream HR API** (`UpstreamApiService`) — Fetches candidates/employees/positions from internal Unosquare API
- **Catalog API** (`CatalogService`) — Core catalogs service
- **Voyage AI** (`VoyageEmbeddingService`) — Vector embeddings for semantic search (model: `voyage-4-large`)
- **Claude Proxy** (`ClaudeProxyService`) — AI scoring/analysis via Claude models (Haiku for fast filtering, Sonnet for deep analysis)

### Database

The app uses SQLite (`better-sqlite3`) with `sqlite-vec` for vector similarity search, stored at `app.getPath('userData')/nexus.db`.

Key entities: `SyncedCandidate`, `SyncedEmployee`, `SyncedOpenPosition`, `ResumeSession`, `ResumeEmbedding`, `MatchSession`, `TransformSession`, `OpenPositionCandidate`.

## Frontend Service Layer

All cross-process calls go through service modules in `src/renderer/apps/resume/services/`, using `window.api.*` methods exposed by preload.

### IPC Service Mapping

| Service | IPC Domain | Purpose |
|---------|------------|---------|
| `dataSyncService.ts` | `sync:*` | Token validation, sync operations |
| `resumeProcessingService.ts` | `processing:*` | Text extraction, vectorization |
| `matchEngineService.ts` | `match:*` | Match search, sessions, pipeline events |
| `sessionService.ts` | `sessions:*` | Transform session CRUD |
| `databaseSharingService.ts` | `database:*` | DB export/import |
| `benchBurnService.ts` | `match:*` | Bench burn flow |
| `transformSessionService.ts` | `sessions:*` | Transform session management |

Services that are **purely client-side** remain renderer-only:
- `fileExtractionService.ts` — PDF.js/mammoth in renderer
- `validationService.ts` — validation logic
- `pdfExportService.ts` — HTML generation
- `templateFillService.ts` — client-side logic

## Glassmorphism Design System

The app uses a custom glassmorphism design system defined in `src/renderer/index.css` via Tailwind `@layer components`. Always use these classes instead of raw Tailwind for containers and inputs:

| Class | Use For |
|-------|---------|
| `.glass-panel` | Main content panels/sections |
| `.glass-panel-subtle` | Secondary/nested panels |
| `.glass-nav` | Navigation bars |
| `.glass-card` | Card containers |
| `.glass-card-hover` | Clickable/interactive cards |
| `.glass-button` | Secondary buttons |
| `.glass-input` | Text inputs, textareas |
| `.glass-select` | Select dropdowns (includes custom arrow) |
| `.minimal-divider` | Horizontal rules / dividers |
| `.text-muted` | De-emphasized text |
| `.text-primary` | Primary text (handles dark mode) |
| `.text-secondary` | Secondary text (handles dark mode) |

All glass classes include dark mode variants automatically. The color system uses:
- **`accent-*`** (blue) — primary brand color
- **`dark-*`** — dark mode surface colors (bg, surface, card, border, hover, muted)

### Dark Mode

Dark mode is toggled via `ThemeContext` and applied using Tailwind's `class` strategy (`darkMode: 'class'`). Every new component must support both light and dark modes.

## Domain Model

All TypeScript interfaces and types are defined in **`src/renderer/apps/resume/types/index.ts`**. This is the single source of truth for the frontend domain model. Key type groups:

- **Resume types**: `StructuredResume`, `ResumeSection`, `ExperienceEntry`, `EducationEntry`, `SkillCategory`
- **Match types**: `MatchCandidate`, `MatchScores`, `SkillMatch`, `GapAnalysis`, `SonnetAnalysis`, `FitVerdict`
- **Pipeline types**: `PipelineStats`, `PipelineStages`, `SearchProgress`, `PoolCounts`
- **Sync types**: `SyncRecord`, `SyncProgress`, `ProcessingRecord`
- **Session types**: `MatchSessionSummary`, `MatchSessionDetail`, `TransformSessionSummary`
- **Batch types**: `BatchJob`, `BatchConfig`, `BatchResult`
- **Bench Burn types**: `BenchEmployee`, `BenchOpenPosition`, `CrossMatchResult`, `BenchBurnResult`
- **Flow step types**: `MatchStepKey`, `DeliveryToOpStepKey`, `ExternalCandidateToOpStepKey`, `BatchStepKey`, `BenchBurnStepKey`

When adding new features, add types here first, not inline in components.

## Component Guidelines

### Creating New Components

1. Create components in the appropriate directory:
   - Global shared components → `src/renderer/components/`
   - Resume app components → `src/renderer/apps/resume/components/{feature}/`
   - Page components → `src/renderer/apps/resume/pages/`
2. Use TypeScript interfaces for props
3. Follow React hooks best practices
4. Use glassmorphism design system classes for styling

## State Management

For simple state, use React's built-in hooks:
- `useState` for local component state
- `useEffect` for side effects
- `useContext` for shared state (`ThemeContext` for dark/light mode)
- `useReducer` for complex state logic

## Comment Guidelines

**NO COMMENTS** in production code unless absolutely critical. Write self-documenting code with descriptive names.

## TypeScript Best Practices

- Define interfaces for all props and state
- Use type inference where possible
- Avoid using `any` type
- Export types from `src/renderer/apps/resume/types/index.ts` for reuse
- Add new domain types to the canonical types file, not inline in components

## Testing

### Frontend (Vitest)
- Config: `vitest.config.ts`
- Setup: `src/test-setup.ts`
- Test files colocated with source
- Pattern: AAA (Arrange-Act-Assert)
- Mock `window.api.*` for IPC-backed services

### Backend Services (Vitest node mode)
- Location: `src/main/services/__tests__/`
- DB testing: in-memory SQLite (`:memory:`)
- E2E: Playwright with `@playwright/test` + `_electron`
- Run: `vitest run`

## Security & Sensitive Data

- API keys and app settings are stored in `app.getPath('userData')/config.json` (outside repo)
- `ClaudeProxy` runs locally at `http://localhost:3456`
- Upstream API tokens are validated per-session and are not persisted in app config

### Electron Security (Non-Negotiable)
- `contextIsolation: true` — never set to false
- `nodeIntegration: false` — never set to true
- `sandbox: true` — keep enabled
- `webSecurity: true` — never disable
- All IPC handlers must call `validateSender(event)` as first line
- Set CSP headers via `session.defaultSession.webRequest.onHeadersReceived()`
- Never expose raw `ipcRenderer`; expose typed preload wrappers only

## Development Workflow

**Running in development:**
```bash
npm run dev
```

**Building:**
```bash
npm run build
```

**Packaging:**
```bash
npm run make
```

**Prerequisites:**
- Node.js 24+ (aligned with Electron 40 toolchain)
- Claude Proxy running on port 3456 (for AI features)

## Performance Optimization

- Use `React.memo` for expensive components
- Implement lazy loading with `React.lazy()`
- Optimize images and assets
- Use production builds for release packaging

## Troubleshooting

**White screen on startup**: Check `loadFile`/`loadURL` target and ensure resolved path exists.  
**`require is not defined` in renderer**: Expected with context isolation; use preload + `contextBridge`.  
**`window.api is undefined`**: Verify preload points to compiled `.js` output and is loaded by BrowserWindow.  
**Native module crash (`better-sqlite3`)**: Rebuild native modules for Electron ABI (`npx electron-rebuild`).  
**`sqlite-vec` extension not found**: Verify platform-specific extension path (`.dylib`/`.so`/`.dll`) in packaged resources.  
**IPC not working**: Ensure preload path uses `path.join(__dirname, ...)` and handler channel names match shared constants.  
**Large installer size**: Validate Forge `files` config and keep `asar: true`.

## Important Notes

- Don't write markdown files to the root directory unless explicitly requested.

---

Generated by Unosquare Design Template System

## Agents

<!-- AUTO-GENERATED by Agent Studio — do not edit manually -->

| Agent | Description | Skills |
|-------|-------------|--------|
| `agentic-architect` | Claude-based agentic system design specialist. Delegates to this agent for designing multi-agent architectures, orchestration patterns, prompt engineering, tool use patterns, and Claude API integration. Use when the task involves AI agents, LLM orchestration, or Claude-specific features. | claude-code-cli, ipc-patterns |
| `code-planner` | Code structure and module design specialist. Delegates to this agent for code architecture decisions, module decomposition, refactoring plans, dependency analysis, and design pattern selection. Use when the task involves code organization, refactoring, or architectural planning. | none |
| `db-architect` | Database design and query optimization specialist. Delegates to this agent for schema design, SQL queries, indexing strategies, data modeling, migrations, and database performance tuning. Use when the task involves databases, SQL, SQLite, schema changes, or data access patterns. Also use for Supabase PostgreSQL or Drizzle ORM work on external projects (e.g., MarketingHQ). | sqlite-patterns, supabase-architect |
| `docs-diagrams-specialist` | Documentation and diagrams specialist. Delegates to this agent for design documents, Mermaid diagram generation, code-to-diagram conversion, architecture documentation, API docs, and technical documentation with visual diagrams. Use when the task involves creating diagrams, design docs, documenting architecture, or converting code to visual documentation. | none |
| `electron-architect` | Electron desktop application specialist. Delegates to this agent for Electron app architecture, BrowserWindow management, IPC communication (ipcMain/ipcRenderer/contextBridge), preload scripts, context isolation, process sandboxing, native OS integration (Tray, Menu, dialog, notifications, deep links, protocol handlers), auto-updates, code signing, notarization, packaging with electron-builder or Electron Forge, performance optimization, ESM configuration, Electron Fuses, ASAR integrity, security hardening, and cross-platform distribution (Windows, macOS, Linux). Use when the task involves Electron, BrowserWindow, desktop app, main process, renderer process, preload, IPC, system tray, native menus, electron-builder, electron-forge, code signing, auto-updater, or any desktop application development work. | electron-pro, claude-code-cli, ipc-patterns |
| `execution-planner` | Task sequencing and project planning specialist. Delegates to this agent for breaking down complex tasks into ordered steps, estimating effort, identifying dependencies, and creating execution plans. Use when the task involves project planning, task breakdown, or estimation. | none |
| `git-github-specialist` | Git workflows and GitHub specialist. Delegates to this agent for branching strategies, pull request management, merge conflict resolution, Git hooks, GitHub Actions, and repository management. Use when the task involves Git, GitHub, version control, or PRs. | git-workflow |
| `orchestrator` | Central coordinator that analyzes user requests, delegates to specialist agents, and synthesizes results. Never writes code directly. | none |
| `react-architect` | Frontend React/TypeScript specialist. Delegates to this agent for React component architecture, state management, routing, performance optimization, and TypeScript patterns. Use proactively when the task involves React, JSX, TSX, hooks, or frontend UI work. | none |
| `requirements-specialist` | Requirements engineering and specification specialist. Delegates to this agent for user story writing, acceptance criteria definition, feature specifications, requirements analysis, and documentation. Use when the task involves requirements, specs, user stories, or acceptance criteria. | none |
| `ux-ui-specialist` | UX/UI design and usability specialist with comprehensive design intelligence. 50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types, three-layer design token architecture, shadcn/ui + Tailwind CSS 4 patterns, accessibility (WCAG + Apple HIG + Material Design), brand identity management, and searchable design databases. Delegates to this agent for user interface design, user experience improvements, accessibility audits, responsive layouts, design system components, visual polish, color/typography selection, and brand consistency. | ui-ux-pro-max, ui-styling, design-system, brand |
| `cicd-devops` | CI/CD pipelines and DevOps specialist. Delegates to this agent for build automation, continuous integration, deployment pipelines, Docker configuration, and development environment setup. Use when the task involves CI/CD, builds, Docker, or DevOps tooling. | none |
| `cloud-infrastructure` | Cloud architecture and Infrastructure as Code specialist. Delegates to this agent for cloud service design, IaC templates, serverless architecture, networking, and cloud cost optimization. Use when the task involves AWS, Azure, GCP, Terraform, or cloud architecture. | none |
| `dotnet-architect` | .NET/C# backend specialist. Delegates to this agent for .NET architecture, C# coding, Entity Framework Core, ASP.NET Core APIs, dependency injection, backend service design, MSBuild project configuration, NuGet package management, performance optimization, unit testing, and .NET version migrations. Use when the task involves .NET, C#, NuGet, MSBuild, EF Core, or backend API development. | dotnet-architect |
| `generalist-agent` | Default conversational agent. Routes ALL initial user interactions here first. Handles chat, Q&A, code review, brainstorming, troubleshooting, concept explanations, error debugging, and quick code snippets. Has web search for verifying current information. Delegates to specialist agents when tasks require deep procedural execution like project planning, multi-file code generation, architecture documents, build configurations, database migrations, or deployment pipelines. This is the entry point for every conversation — specialists are only spawned on demand. | claude-code-cli |
| `generalist-developer` | General-purpose software developer specialist. Delegates to this agent for tasks that fall outside the scope of specialized agents — including but not limited to: Node.js, Python, Go, Rust, Java, Ruby, PHP, shell scripting, REST API design, GraphQL, Docker, Kubernetes, message queues, caching, microservices, serverless functions, data processing, CLI tool development, and general backend/infrastructure work. Use when no other specialist matches the technology or task domain. | none |

## Skills

<!-- AUTO-GENERATED by Agent Studio — do not edit manually -->

| Skill | Description | Path |
|-------|-------------|------|
| `claude-code-cli` | No description | `.claude/skills/claude-code-cli/SKILL.md` |
| `ipc-patterns` | Agent Studio IPC patterns: typed channels, preload bridge, streaming events, error handling, validateSender. Trigger: IPC handler, preload bridge, window.api, ipcMain.handle, ipcRenderer.invoke, streaming chunks, renderer-main communication. | `.claude/skills/ipc-patterns/SKILL.md` |
| `sqlite-patterns` | SQLite schema design, query optimization, better-sqlite3 patterns, and repository implementation for Electron desktop apps. Use when working with database schema, SQL queries, migrations, indexing, or data access layers in better-sqlite3 projects. | `.claude/skills/sqlite-patterns/SKILL.md` |
| `supabase-architect` | Supabase PostgreSQL + Drizzle ORM for external projects: schema design, migrations, RLS, pgvector, indexing, query tuning. Trigger: Supabase, Drizzle ORM, PostgreSQL, RLS policies, pgvector, connection pooling. NOT for Agent Studio SQLite. | `.claude/skills/supabase-architect/SKILL.md` |
| `electron-pro` | Use this skill for ANY Electron desktop application work — creating new apps, debugging IPC issues, configuring builds, setting up auto-updates, code signing, native OS integration, or optimizing performance. Trigger whenever the user mentions Electron, BrowserWindow, main process, renderer process, preload scripts, electron-builder, electron-forge, contextBridge, ipcMain/ipcRenderer, desktop app packaging, or cross-platform desktop development. Also trigger for Tauri-to-Electron migration questions, choosing between desktop frameworks, Electron security hardening, IPC patterns, or context isolation questions. | `.claude/skills/electron-pro/SKILL.md` |
| `git-workflow` | Git branching strategies, conventional commits, PR workflows, conflict resolution, and GitHub Actions patterns for Electron app projects. Use when working with Git operations, branching, PRs, merge conflicts, or CI/CD pipeline configuration. | `.claude/skills/git-workflow/SKILL.md` |
| `ui-ux-pro-max` | UI/UX design intelligence: 50+ styles, 161 palettes, 57 font pairings, 25 chart types across React, Next.js, Vue, Svelte, SwiftUI, Flutter, Tailwind, shadcn/ui. Trigger: UI design, color system, accessibility, animation, typography, layout, component styling, glassmorphism, dark mode, responsive design, UX review. | `.claude/skills/ui-ux-pro-max/SKILL.md` |
| `ui-styling` | No description | `.claude/skills/ui-styling/SKILL.md` |
| `design-system` | Token architecture, component specifications, and slide generation. Three-layer tokens (primitive→semantic→component), CSS variables, spacing/typography scales, component specs, strategic slide creation. Use for design tokens, systematic design, brand-compliant presentations. | `.claude/skills/design-system/SKILL.md` |
| `brand` | Brand voice, visual identity, messaging frameworks, asset management, brand consistency. Activate for branded content, tone of voice, marketing assets, brand compliance, style guides. | `.claude/skills/brand/SKILL.md` |
| `dotnet-architect` | .NET/C# backend architecture: ASP.NET Core, EF Core, Clean Architecture, DI, NuGet, MSBuild, testing, performance, migrations. Trigger: .NET, C#, ASP.NET, EF Core, LINQ, xUnit, CQRS, DDD, middleware, NuGet, MSBuild, net8/net9/net10 upgrades. | `.claude/skills/dotnet-architect/SKILL.md` |
