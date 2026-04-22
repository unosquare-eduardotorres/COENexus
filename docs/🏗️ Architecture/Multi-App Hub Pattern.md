---
tags: [architecture, routing]
---

# 🌐 Multi-App Hub Pattern

## Overview

Operation Nexus uses a **hub-and-spoke** architecture where the main landing page (`NexusLanding`) serves as a hub with cards linking to independent sub-applications.

## Routing Structure

```mermaid
flowchart TB
    Root["/ — NexusLanding (Hub)"] --> Resume["/resume/* — ResumeApp"]

    subgraph ResumeRoutes["Resume App Routes"]
        R1["/resume/ — HomePage"]
        R2["/resume/enhance — TransformPage"]
        R3["/resume/history — TransformHistoryPage"]
        R4["/resume/match — MatchEnginePage"]
        R5["/resume/batch — BatchPage"]
        R6["/resume/data-sync — DataSyncPage"]
        R7["/resume/review — RecruiterDashboard"]
        R8["/resume/settings — AdminDashboard"]
    end

    Resume --> R1
    Resume --> R2
    Resume --> R3
    Resume --> R4
    Resume --> R5
    Resume --> R6
    Resume --> R7
    Resume --> R8

    style Root fill:#3b82f6,color:#fff
    style Resume fill:#8b5cf6,color:#fff
```

## Key Principles

1. **HashRouter** — Uses `#` routing for `file://` compatibility in Electron
2. **Independent sub-apps** — Each app has its own routes, components, services, and types
3. **Shared components** — Global components in `src/renderer/components/`
4. **Shared context** — `ThemeContext` spans the entire app

## Adding a New App

See [[Creating a New App Route]] for a step-by-step guide.

## File Structure

```
src/renderer/
├── hub/                    # Hub landing page
├── apps/
│   └── resume/             # Resume sub-application
│       ├── pages/          # Route-level page components
│       ├── components/     # Feature-specific components
│       ├── services/       # IPC service layer
│       ├── types/          # Domain types
│       ├── data/           # Mock data
│       └── utils/          # Utilities
├── components/             # Shared global components
└── contexts/               # Shared contexts (ThemeContext)
```

## Related
- [[System Overview]]
- [[Creating a New App Route]]
