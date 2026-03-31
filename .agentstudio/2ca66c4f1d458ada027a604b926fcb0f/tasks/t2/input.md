# Task: t2
**Specialist:** electron-architect
**Model:** sonnet
**Complexity:** moderate (score: 8)

## Description
Create Electron main process entry point (electron/main/index.ts) with BrowserWindow configuration, proper security settings (contextIsolation: true, nodeIntegration: false), and embedded Express server initialization on a local port. Include app lifecycle handlers and window management.

--- TASK LOOP: Iteration 1/4 ---
Your previous attempt completed but FAILED quality gates. You MUST fix these issues before finishing.

Current failures:
- [TYPECHECK] TypeScript: unknown error(s).   Property 'onExport' does not exist on type 'IntrinsicAttributes & PdfPreviewPanelProps'.
src/apps/resume/pages/TransformPage.tsx(316,10): error TS6133: 'isGeneratingSuggestions' is declared but its value is never read.
src/apps/resume/pages/TransformPage.tsx(853,9): error TS6133: 'handleExportDocx' is declared but its value is never read.
src/apps/resume/services/pdfExportService.ts(11,47): erro
- [LINT] Lint: unknown issue(s). > coe-operation-nexus@0.0.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
Oops! Something went wrong! :(
ESLint: 8.57.1
ESLint couldn't find a configuration file. To set up a configuration file for this project, please run:
    npm init @eslint/config
ESLint looked for configuration files in /Users/eduardo.torres/Downloads/COE Operation Nexus/.agent-studio/worktr
- [TEST] Tests: unknown failure(s). > coe-operation-nexus@0.0.0 test
> vitest run
sh: vitest: command not found

Focus ONLY on fixing the failing gates. Do not introduce new features or changes.
--- END TASK LOOP CONTEXT ---


--- TASK LOOP: Iteration 2/4 ---
Your previous attempt completed but FAILED quality gates. You MUST fix these issues before finishing.

Current failures:
- [LINT] Lint: 36 issue(s). /Users/eduardo.torres/Downloads/COE Operation Nexus/.agent-studio/worktrees/electron-architect-t2/src/hub/ParticleNetwork.tsx
  3:1  error  Parsing error: The keyword 'interface' is reserved
/Users/eduardo.torres/Downloads/COE Operation Nexus/.agent-studio/worktrees/electron-architect-t2/src/main.tsx
  6:52  error  Parsing error: Unexpected token !
/Users/eduardo.torres/Downloads/COE Operation Nex
- [TEST] Tests: unknown failure(s). > coe-operation-nexus@0.0.0 test
> vitest run
sh: vitest: command not found

Previous iteration(s):
  Iteration 1: typecheck:FAIL, lint:FAIL, test:FAIL

Focus ONLY on fixing the failing gates. Do not introduce new features or changes.
--- END TASK LOOP CONTEXT ---


## Dependency Outputs