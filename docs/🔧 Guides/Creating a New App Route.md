---
tags: [guide, routing]
---

# 🌐 Creating a New App Route

Guide for adding a new page or sub-application to the Operation Nexus hub.

## Adding a Page to an Existing App (Resume App)

### 1. Create the Page Component

Create `src/renderer/apps/resume/pages/MyNewPage.tsx`:

```typescript
export default function MyNewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">My New Page</h1>
      <div className="glass-panel p-6">
        {/* Page content */}
      </div>
    </div>
  );
}
```

### 2. Add the Route

In the Resume App router configuration, add:

```typescript
{ path: 'my-new-page', element: <MyNewPage /> }
```

### 3. Add Navigation

Add a link in the Resume App navigation to the new page.

## Adding a New Sub-Application

### 1. Create the App Directory

```
src/renderer/apps/my-app/
├── pages/
├── components/
├── services/
├── types/
└── index.tsx        # App root with sub-routes
```

### 2. Create the App Root

```typescript
// src/renderer/apps/my-app/index.tsx
import { Routes, Route } from 'react-router-dom';

export default function MyApp() {
  return (
    <Routes>
      <Route index element={<MyAppHome />} />
      {/* More routes */}
    </Routes>
  );
}
```

### 3. Register in Main Router

Add to `src/renderer/App.tsx`:

```typescript
<Route path="/my-app/*" element={<MyApp />} />
```

### 4. Add Hub Card

Add a card in `NexusLanding` that links to `/my-app`.

## Design Guidelines

- Use glassmorphism classes: `glass-panel`, `glass-card`, `glass-input`, etc.
- Support both light and dark modes
- Follow existing page layout patterns
- Define types in the app's `types/index.ts`

## Related
- [[Multi-App Hub Pattern]]
- [[System Overview]]
- [[ADR-002 Glassmorphism Design System]]
