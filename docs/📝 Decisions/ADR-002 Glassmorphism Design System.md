---
status: accepted
date: 2026-02-20
tags: [adr, ui, design]
---

# ADR-002: Glassmorphism Design System

## Context

The application needed a consistent, modern visual design system that:
- Supports light and dark modes
- Provides reusable component styles
- Is easy to maintain and extend
- Looks professional for an internal enterprise tool

Options considered:
1. **shadcn/ui** — Component library with Tailwind
2. **Material UI** — Google's design system
3. **Custom glassmorphism** — Tailwind `@layer components` with glass effects

## Decision

We chose a **custom glassmorphism design system** built on Tailwind CSS `@layer components`, defined in `src/renderer/index.css`.

**Reasons:**
- **Distinctive visual identity** — Glass effects create a premium, modern feel
- **Lightweight** — No component library dependency, just CSS classes
- **Full control** — Every class is defined in one file, easy to modify
- **Dark mode built-in** — All glass classes include `dark:` variants automatically
- **Tailwind-native** — Composable with any Tailwind utility

## Consequences

**Easier:**
- Consistent styling — developers use `.glass-panel`, `.glass-card`, etc. instead of raw Tailwind
- Dark mode is automatic for all glass components
- Single source of truth in `index.css`
- No version conflicts with component library updates

**Harder:**
- No pre-built complex components (modals, dropdowns, data tables)
- New developers need to learn the glass class vocabulary
- Custom components require more manual styling work
- Accessibility needs manual attention (not provided by a component library)

## Related
- [[System Overview]]
