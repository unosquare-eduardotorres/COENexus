---
tags: [guide, setup]
---

# 🛠️ Development Setup

## Prerequisites

- **Node.js 24+** (aligned with Electron 40 toolchain)
- **Obsidian** (optional, for this documentation vault)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repo-url>
cd "COE Operation Nexus"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development

```bash
npm run dev
```

This starts electron-vite in dev mode with hot reload for the renderer process.

### 4. External Services

| Service | URL | Required For |
|---------|-----|-------------|
| Claude Proxy | `http://localhost:3456` | AI features (match scoring, resume transformation) |
| Upstream HR API | Internal Unosquare API | Data sync (requires valid token) |

### 5. Database

The SQLite database is automatically created at `app.getPath('userData')/nexus.db` on first run. Migrations run automatically via `migrationRunner.ts`.

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev mode |
| `npm run build` | Build for production |
| `npm run make` | Package installer |
| `vitest run` | Run all tests |
| `vitest --ui` | Open Vitest UI |

## Project Documentation

Open the `docs/` folder in Obsidian to access the full project documentation vault.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| White screen on startup | Check `loadFile`/`loadURL` target path |
| `require is not defined` | Expected — use preload + contextBridge |
| `window.api is undefined` | Verify preload path points to compiled `.js` |
| Native module crash | Run `npx electron-rebuild` |
| `sqlite-vec` not found | Check platform-specific extension path |

## Related
- [[System Overview]]
- [[Testing Guide]]
