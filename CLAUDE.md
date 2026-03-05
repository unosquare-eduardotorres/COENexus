# CLAUDE.md - resume-transformer-i-want-to-create-an-app-that-c

This file provides guidance to Claude Code (claude.ai/code) when working with this project.

## Project Overview

**Name**: resume-transformer-i-want-to-create-an-app-that-c
**Description**: A modern React application
**Author**: Unosquare
**Created**: 2026-02-13T23:16:25.301Z

This is a React application built with Vite, TypeScript, and Tailwind CSS. It was generated from the Unosquare Design template system.

## Technology Stack

- **React 18**: Component-based UI framework
- **Vite**: Fast build tool with HMR (Hot Module Replacement)
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint**: Code linting and formatting

## Project Structure

```
resume-transformer-i-want-to-create-an-app-that-c/
├── src/
│   ├── components/     # React components
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Application entry point
│   ├── index.css       # Global styles with Tailwind
│   └── App.css         # Component-specific styles
├── public/             # Static assets
├── index.html          # HTML template
└── vite.config.ts      # Vite configuration
```

**IMPORTANT**: Do NOT run `npm install` or `npm ci` or `npm build` commands. When you need to add dependencies, modify the `package.json` file directly. The preview service automatically installs dependencies when you view the application.

**IMPORTANT - Documentation Files**:
- Do NOT create README.md, CHANGELOG.md, CONTRIBUTING.md, or any other documentation files in the root directory unless explicitly requested by the user
- Do NOT create markdown files summarizing work completed, listing changes, or documenting features after finishing tasks
- Only create documentation files when the user specifically asks for documentation
- If you need to communicate changes or completion status, output the information directly to the user rather than creating a file

## Component Guidelines

### Creating New Components

1. Create components in `src/components/` directory
2. Use TypeScript interfaces for props
3. Follow React hooks best practices
4. Use Tailwind CSS for styling

Example component structure:
```typescript
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold">{title}</h2>
      {onAction && (
        <button 
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Action
        </button>
      )}
    </div>
  );
}
```

## Styling with Tailwind CSS

This project uses Tailwind CSS for styling. Key conventions:

- Use utility classes for layout and spacing
- Create component classes in App.css for complex, reusable styles
- Follow mobile-first responsive design
- Use Tailwind's color palette for consistency

Common patterns:
```jsx
// Card container
<div className="bg-white rounded-lg shadow-md p-6">

// Button
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## State Management

For simple state, use React's built-in hooks:
- `useState` for local component state
- `useEffect` for side effects
- `useContext` for shared state
- `useReducer` for complex state logic

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

### Examples of Bad Comments to Avoid:
```typescript
// Set loading to true
setLoading(true);

// Call the API to get courses
const courses = await getCourses();

// Update the state with courses
setCourses(courses);

// Set loading to false
setLoading(false);
```

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
- Export types from a central `types.ts` file for reuse

## Performance Optimization

- Use React.memo for expensive components
- Implement lazy loading with React.lazy()
- Optimize images and assets
- Use production builds for deployment

## Common Tasks

### Adding a New Page/Route
1. Add react-router-dom to package.json dependencies: `"react-router-dom": "^6.20.0"`
2. Create page components in `src/pages/`
3. Set up routing in App.tsx

### Adding Icons
1. Add lucide-react to package.json dependencies: `"lucide-react": "^0.300.0"`
2. Import and use icons as components
3. Preview service will automatically install the new dependency

## Troubleshooting

### Common Issues

**Port already in use**: Change port in vite.config.ts
**Module not found**: Check imports and verify package.json dependencies are correct
**TypeScript errors**: Check type definitions and interfaces
**Styling not applied**: Ensure Tailwind is properly configured

## Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [TypeScript Documentation](https://www.typescriptlang.org)

## Important Notes

- **No Backwards Compatibility Needed**: This application has not yet been released to production, so backwards compatibility is not a concern when implementing new features or making changes.
- **Don't write markdown files to the root directory**: Unless explicilty asked to do so.

---

Generated by Unosquare Design Template System