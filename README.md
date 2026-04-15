# Operation Nexus

A desktop-first internal tool for resume transformation, candidate-to-opportunity matching (via vector embeddings + AI scoring), data synchronization from upstream HR systems, and batch processing. Built as a multi-app hub with a React renderer and Node.js services in Electron main process.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 40.x (Chromium 144, Node 24) |
| Build | electron-vite 4.x |
| Frontend | React 19.2 + TypeScript |
| Styling | Tailwind CSS (glassmorphism design system) |
| Database | SQLite (better-sqlite3) + sqlite-vec |
| Testing | Vitest 4.0 (multi-project) + Playwright (E2E) |
| Packaging | Electron Forge 7.x |

## Prerequisites

- Node.js 24+
- Claude Proxy running on port 3456 (for AI features)

## Development

```bash
npm run dev          # Start in development mode
npm run test         # Run all tests
npm run test:coverage # Run tests with coverage report
npm run build        # Production build
npm run make         # Package for distribution
```

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
│   ├── ipc/        # IPC handler registrations
│   ├── services/   # Business logic services
│   └── db/         # SQLite database layer
├── preload/        # Typed contextBridge API
├── renderer/       # React frontend
│   ├── hub/        # Landing page
│   ├── apps/       # Sub-applications
│   │   ├── resume/     # Resume transformation
│   │   ├── datasync/   # HR data synchronization
│   │   ├── path/       # Developer career path
│   │   ├── agents/     # AI agents
│   │   ├── command-center/ # Operations dashboard
│   │   └── settings/   # App configuration
│   └── components/ # Shared UI components
└── shared/         # Cross-process types & constants
```

## Author

Unosquare

## License

Private
