# CLAUDE.md - Operation Nexus

This file provides guidance to Claude Code (claude.ai/code) when working with this project.

## Project Overview

**Name**: Operation Nexus (COE Operation Nexus)
**Description**: A full-stack internal tool for resume transformation, candidate-to-opportunity matching (via vector embeddings + AI scoring), data synchronization from upstream HR systems, and batch processing. Built as a multi-app hub with a React frontend and ASP.NET Core API backend.
**Author**: Unosquare
**Created**: 2026-02-13T23:16:25.301Z

## Technology Stack

- **React 18**: Component-based UI framework
- **Vite**: Fast build tool with HMR (Hot Module Replacement)
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework with custom glassmorphism design system
- **ESLint**: Code linting and formatting
- **ASP.NET Core (net10.0)**: Backend API with Controllers
- **Entity Framework Core 9**: ORM with PostgreSQL (Npgsql) + pgvector
- **xUnit + NSubstitute**: Backend testing

## Project Structure

```
COE Operation Nexus/
├── src/                          # React frontend
│   ├── App.tsx                   # Root router: / → NexusLanding, /resume/* → ResumeApp
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Glassmorphism design system (@layer components)
│   ├── hub/                      # Multi-app hub landing
│   │   ├── NexusLanding.tsx
│   │   ├── AppCard.tsx
│   │   └── ParticleNetwork.tsx
│   ├── apps/resume/              # Resume sub-application
│   │   ├── ResumeApp.tsx         # Sub-router with all resume routes
│   │   ├── pages/                # Route-level containers
│   │   │   ├── HomePage.tsx
│   │   │   ├── TransformPage.tsx
│   │   │   ├── TransformHistoryPage.tsx
│   │   │   ├── MatchEnginePage.tsx
│   │   │   ├── BenchBurnPage.tsx
│   │   │   ├── DeliveryToOpPage.tsx
│   │   │   ├── ExternalCandidateToOpPage.tsx
│   │   │   ├── BatchPage.tsx
│   │   │   ├── DataSyncPage.tsx
│   │   │   ├── RecruiterDashboard.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── components/           # UI components organized by feature
│   │   │   ├── match/            # Match engine components
│   │   │   ├── batch/            # Batch processing components
│   │   │   ├── datasync/         # Data sync dashboard components
│   │   │   ├── settings/         # Admin/settings panels
│   │   │   └── shared/           # Shared UI (StepperBar, etc.)
│   │   ├── services/             # API service layer (fetch-based)
│   │   ├── types/index.ts        # Canonical domain model (all TypeScript interfaces)
│   │   ├── data/                 # Default configs, prompts, sample data
│   │   └── utils/                # Pure utility functions
│   ├── components/               # Global shared components (VemLogo)
│   └── contexts/                 # React contexts (ThemeContext)
├── backend/                      # ASP.NET Core API (net10.0)
│   ├── Program.cs                # DI registration, middleware, DB migration
│   ├── Controllers/              # API controllers (5 route groups)
│   ├── Services/                 # Business logic + external integrations
│   ├── Models/                   # DTOs and entity models
│   │   ├── Entities/             # EF Core entities (DB tables)
│   │   └── *.cs                  # Request/response DTOs
│   ├── Data/                     # NexusDbContext (EF Core)
│   ├── Configuration/            # Settings classes (Upstream, Voyage, ClaudeProxy, Catalog)
│   ├── Converters/               # JSON converters
│   ├── Migrations/               # EF Core migrations
│   └── tests/                    # xUnit + NSubstitute tests
└── vitest.config.ts              # Frontend test configuration
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

| Route         | Page                        | Purpose                                      |
|---------------|-----------------------------|----------------------------------------------|
| `/`           | `HomePage`                  | Dashboard / entry point                      |
| `/enhance`    | `TransformPage`             | AI-powered resume transformation             |
| `/history`    | `TransformHistoryPage`      | Past transform sessions                      |
| `/match`      | `MatchEnginePage`           | Candidate-to-opportunity matching             |
| `/batch`      | `BatchPage`                 | Batch resume processing                      |
| `/data-sync`  | `DataSyncPage`              | Sync data from upstream HR systems            |
| `/review`     | `RecruiterDashboard`        | Resume review and editing                     |
| `/settings`   | `AdminDashboard`            | Admin settings, database sharing              |

### Match Engine Flows

The match engine supports three distinct flows:
1. **Standard Match** (`MatchEnginePage`) — Match synced candidates to a job description
2. **Bench Burn** (`BenchBurnPage`) — Match bench employees to open positions
3. **Delivery-to-Op** (`DeliveryToOpPage`) — Match delivery employees to opportunities
4. **External Candidate-to-Op** (`ExternalCandidateToOpPage`) — Upload external resumes and match to positions

## Backend API

**Base URL**: `http://localhost:5002` (configurable via `BACKEND_PORT` or `Server:Port`)

### Controllers & Route Groups

| Controller              | Base Route         | Responsibility                                          |
|-------------------------|--------------------|---------------------------------------------------------|
| `SyncController`        | `/api/sync`        | Token validation, data sync from upstream HR systems     |
| `ProcessingController`  | `/api/processing`  | Resume text extraction, vectorization pipeline           |
| `MatchController`       | `/api/match`       | Match engine (search, sessions, bench burn, pool counts) |
| `DatabaseController`    | `/api/database`    | Database sharing between instances                       |
| `SessionsController`    | `/api/sessions`    | Transform session persistence                            |

### External Dependencies

- **Upstream HR API** (`UpstreamApiService`) — Fetches candidates/employees/positions from internal Unosquare API
- **Catalog API** (`CatalogService`) — Core catalogs service
- **Voyage AI** (`VoyageEmbeddingService`) — Vector embeddings for semantic search (model: `voyage-4-large`)
- **Claude Proxy** (`ClaudeProxyService`) — AI scoring/analysis via Claude models (Haiku for fast filtering, Sonnet for deep analysis)

### Database

- **PostgreSQL** with **pgvector** extension for vector similarity search
- **EF Core** code-first with auto-migration on startup
- Key entities: `SyncedCandidate`, `SyncedEmployee`, `SyncedOpenPosition`, `ResumeSession`, `ResumeEmbedding`, `MatchSession`, `TransformSession`

### Backend Service Registration Pattern
All services are registered in `Program.cs` using constructor injection:
- `AddScoped<IInterface, Implementation>()` for request-scoped services
- `AddSingleton<>()` for stateless services (text extractor, job queue)
- `AddHostedService<>()` for background workers (embedding pipeline)

## Frontend Service Layer

All API calls go through service modules in `src/apps/resume/services/`. Each service encapsulates a backend route group:

| Service                      | API Base          | Purpose                                    |
|------------------------------|-------------------|--------------------------------------------|
| `dataSyncService.ts`         | `/api/sync`       | Token validation, sync operations           |
| `resumeProcessingService.ts` | `/api/processing` | Text extraction, vectorization              |
| `matchEngineService.ts`      | `/api/match`      | Match search, sessions, pipeline            |
| `sessionService.ts`          | `/api/sessions`   | Transform session CRUD                      |
| `databaseSharingService.ts`  | `/api/database`   | DB export/import                            |
| `benchBurnService.ts`        | `/api/match`      | Bench burn match flow                       |
| `transformSessionService.ts` | `/api/sessions`   | Transform session management                |

### API Call Pattern
```typescript
const API_BASE = '/api/sync';

export const dataSyncService = {
  async methodName(param: Type): Promise<ReturnType> {
    const res = await fetch(`${API_BASE}/endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { /* handle error */ }
    return res.json();
  },
};
```

Services use the native `fetch` API (no axios). Error handling is done at the call site with try-catch.

## Glassmorphism Design System

The app uses a custom glassmorphism design system defined in `src/index.css` via Tailwind `@layer components`. **Always use these classes instead of raw Tailwind for containers and inputs:**

| Class               | Use For                                  |
|---------------------|------------------------------------------|
| `.glass-panel`      | Main content panels/sections             |
| `.glass-panel-subtle` | Secondary/nested panels                |
| `.glass-nav`        | Navigation bars                          |
| `.glass-card`       | Card containers                          |
| `.glass-card-hover` | Clickable/interactive cards              |
| `.glass-button`     | Secondary buttons                        |
| `.glass-input`      | Text inputs, textareas                   |
| `.glass-select`     | Select dropdowns (includes custom arrow) |
| `.minimal-divider`  | Horizontal rules / dividers              |
| `.text-muted`       | De-emphasized text                       |
| `.text-primary`     | Primary text (handles dark mode)         |
| `.text-secondary`   | Secondary text (handles dark mode)       |

All glass classes include dark mode variants automatically. The color system uses:
- **`accent-*`** (blue) — Primary brand color (defined in `tailwind.config.js`)
- **`dark-*`** — Dark mode surface colors (bg, surface, card, border, hover, muted)

### Dark Mode
Dark mode is toggled via `ThemeContext` and applied using Tailwind's `class` strategy (`darkMode: 'class'`). Every new component must support both light and dark modes.

## Domain Model

All TypeScript interfaces and types are defined in **`src/apps/resume/types/index.ts`** (~860 lines). This is the single source of truth for the frontend domain model. Key type groups:

- **Resume types**: `StructuredResume`, `ResumeSection`, `ExperienceEntry`, `EducationEntry`, `SkillCategory`
- **Match types**: `MatchCandidate`, `MatchScores`, `SkillMatch`, `GapAnalysis`, `SonnetAnalysis`, `FitVerdict`
- **Pipeline types**: `PipelineStats`, `PipelineStages`, `SearchProgress`, `PoolCounts`
- **Sync types**: `SyncRecord`, `SyncProgress`, `ProcessingRecord`
- **Session types**: `MatchSessionSummary`, `MatchSessionDetail`, `TransformSessionSummary`
- **Batch types**: `BatchJob`, `BatchConfig`, `BatchResult`
- **Bench Burn types**: `BenchEmployee`, `BenchOpenPosition`, `CrossMatchResult`, `BenchBurnResult`
- **Flow step types**: `MatchStepKey`, `DeliveryToOpStepKey`, `ExternalCandidateToOpStepKey`, `BatchStepKey`, `BenchBurnStepKey`

When adding new features, add types here first — not inline in components.

## Component Guidelines

### Creating New Components

1. Create components in the appropriate directory:
   - Global shared components → `src/components/`
   - Resume app components → `src/apps/resume/components/{feature}/`
   - Page components → `src/apps/resume/pages/`
2. Use TypeScript interfaces for props
3. Follow React hooks best practices
4. Use the glassmorphism design system classes for styling (see above)

Example component structure:
```typescript
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="glass-panel p-4">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-accent-500 text-white rounded hover:bg-accent-600"
        >
          Action
        </button>
      )}
    </div>
  );
}
```

## State Management

For simple state, use React's built-in hooks:
- `useState` for local component state
- `useEffect` for side effects
- `useContext` for shared state (currently `ThemeContext` for dark/light mode)
- `useReducer` for complex state logic

Page components manage their own complex state internally. Planned migration to TanStack Query for server-state management.

## Comment Guidelines

**NO COMMENTS** in production code unless absolutely critical. Write self-documenting code with descriptive names.

### Acceptable Comments (Very Rare):
- **Complex algorithm explanations**: Only when the logic cannot be clarified through better function/variable names
- **Temporary workarounds**: With issue references (e.g., `// TODO: Fix when API supports X (ticket #123)`)
- **Legal/license headers**: If required by company policy
- **Critical security warnings**: Where security implications aren't obvious from code

### NEVER Add Comments For:
- **Obvious action descriptions**: `// Set loading state`, `// Call API`, `// Update component`
- **Component section markers**: `// State`, `// Effects`, `// Event handlers`
- **JSDoc for internal functions**: Only for public library APIs
- **What the code does**: Comments that repeat what the code clearly shows
- **Variable assignments**: `// Store user data`, `// Initialize state`

### Write Self-Documenting Code Instead:
```typescript
const loadCourses = async () => {
  setLoading(true);
  const courses = await getCourses();
  setCourses(courses);
  setLoading(false);
};
```

## TypeScript Best Practices

- Define interfaces for all props and state
- Use type inference where possible
- Avoid using `any` type
- Export types from the central `src/apps/resume/types/index.ts` file for reuse
- Add new domain types to the canonical types file, not inline in components

## Testing

### Frontend (Vitest)
- Config: `vitest.config.ts`
- Setup: `src/test-setup.ts`
- Test files colocated with source (e.g., `YearSelector.test.tsx` next to `YearSelector.tsx`)
- Pattern: AAA (Arrange-Act-Assert)
- Naming: `should... — e.g., 'should render year options'`

### Backend (xUnit + NSubstitute)
- Location: `backend/tests/OperationNexus.Tests/`
- Mocking: NSubstitute for interface mocking
- DB Testing: `TestDbContext.cs` for in-memory database setup
- Existing tests: `CatalogServiceTests`, `SyncOrchestratorTests`, `SyncControllerE2ETests`, `ResumeSessionVectorizerTests`, `EmbeddingBackgroundServiceTests`, `EmbeddingJobQueueTests`
- Run: `dotnet test` from `backend/tests/OperationNexus.Tests/`

## Security & Sensitive Data

- **`backend/appsettings.json`** contains API keys for Voyage AI and connection strings. Never commit real credentials — use environment variables or user secrets for production.
- The `ClaudeProxy` service runs locally at `http://localhost:3456` — this is a local proxy, not direct Anthropic API access.
- Upstream API tokens are validated per-session and passed from the frontend — they are NOT stored in the backend config.

## Development Workflow

### Running the Frontend
```bash
npm run dev
```
Starts Vite dev server with HMR. The frontend proxies API calls to the backend.

### Running the Backend
```bash
cd backend && dotnet run
```
Starts on port 5002 (auto-migrates the database on startup).

### Prerequisites
- PostgreSQL with pgvector extension
- Node.js (for frontend)
- .NET 10 SDK (for backend)
- Claude Proxy running on port 3456 (for AI features)

## Performance Optimization

- Use React.memo for expensive components
- Implement lazy loading with React.lazy()
- Optimize images and assets
- Use production builds for deployment

## Troubleshooting

### Common Issues

**Port already in use**: Change port in vite.config.ts
**Module not found**: Check imports and verify package.json dependencies are correct
**TypeScript errors**: Check type definitions and interfaces
**Styling not applied**: Ensure Tailwind is properly configured and you're using the glassmorphism design system classes

## Important Notes

- **No Backwards Compatibility Needed**: This application has not yet been released to production, so backwards compatibility is not a concern when implementing new features or making changes.
- **Don't write markdown files to the root directory**: Unless explicitly asked to do so.

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