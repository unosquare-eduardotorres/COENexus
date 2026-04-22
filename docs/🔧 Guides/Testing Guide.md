---
tags: [guide, testing]
---

# 🧪 Testing Guide

## Test Stack

| Tool | Purpose |
|------|---------|
| **Vitest 4.0** | Unit + integration tests (multi-project config) |
| **@testing-library/react** | Component testing |
| **jsdom** | Browser environment for renderer tests |
| **Playwright** | E2E tests (Electron launch + CDP) |

## Test File Conventions

| Type | Pattern | Location |
|------|---------|----------|
| Unit | `*.test.ts` | Colocated with source |
| Component | `*.test.tsx` | Colocated with component |
| Integration | `*.integration.test.ts` | Colocated with source |
| E2E | `e2e/*.spec.ts` | Separate directory |

## Running Tests

```bash
# Run all tests
vitest run

# Watch mode
vitest

# UI mode
vitest --ui

# Specific file
vitest run src/services/validationService.test.ts

# E2E tests
npx playwright test
```

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should return error when summary is empty', () => {
  // Arrange
  const resume = createMockResume({ summary: '' });

  // Act
  const result = validateResume(resume);

  // Assert
  expect(result.errors).toContainEqual(
    expect.objectContaining({ field: 'summary' })
  );
});
```

### Naming Convention

Tests use "should..." naming:
- `should return error when summary is empty`
- `should extract email from content`
- `should match candidate to position with high score`

### Mocking IPC (`window.api.*`)

For renderer tests that call IPC:

```typescript
vi.stubGlobal('window', {
  api: {
    myAction: vi.fn().mockResolvedValue({ result: 'mock' }),
  },
});
```

### Backend Service Tests

Use in-memory SQLite for database tests:

```typescript
import Database from 'better-sqlite3';

const db = new Database(':memory:');
// Run schema SQL
// Test repository methods
```

## Vitest Configuration

Multi-project setup in `vitest.config.ts`:
- **renderer** — jsdom environment for React components
- **main** — node environment for backend services

## Related
- [[Development Setup]]
- [[System Overview]]
