# Task: t3
**Specialist:** electron-architect
**Model:** opus
**Complexity:** moderate (score: 6)

## Description
Create typed IPC channel definitions (electron/shared/ipc-channels.ts) and preload script (electron/preload/index.ts) with contextBridge exposing secure window.api interface. Define channel types for database, AI operations, and file system access matching existing API patterns from src/apps/resume/services/.

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
- [TYPECHECK] TypeScript: unknown error(s). src/apps/resume/components/datasync/SyncRecordTable.test.tsx(2,38): error TS2307: Cannot find module 'vitest' or its corresponding type declarations.
src/apps/resume/components/datasync/SyncRecordTable.test.tsx(33,32): error TS2322: Type '"Intermediate"' is not assignable to type 'Seniority | undefined'.
src/apps/resume/components/datasync/YearSelector.test.tsx(1,43): error TS2307: Cannot find mod
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

Previous iteration(s):
  Iteration 1: typecheck:FAIL, lint:FAIL, test:FAIL

⚠️ STUCK DETECTION: The same gates have been failing repeatedly. Try a DIFFERENT approach — refactor the code, check imports, or simplify the implementation.

Focus ONLY on fixing the failing gates. Do not introduce new features or changes.
--- END TASK LOOP CONTEXT ---


--- TASK LOOP: Iteration 3/4 ---
Your previous attempt completed but FAILED quality gates. You MUST fix these issues before finishing.

Current failures:
- [TYPECHECK] TypeScript: unknown error(s). src/apps/resume/components/datasync/SyncRecordTable.test.tsx(1,32): error TS2307: Cannot find module '@testing-library/react' or its corresponding type declarations.
src/apps/resume/components/datasync/SyncRecordTable.test.tsx(2,38): error TS2307: Cannot find module 'vitest' or its corresponding type declarations.
src/apps/resume/components/datasync/YearSelector.test.tsx(1,43): error TS2307: Canno
- [LINT] Lint: 24 issue(s). /Users/eduardo.torres/Downloads/COE Operation Nexus/.agent-studio/worktrees/electron-architect-t3/src/apps/resume/services/resumeProcessingService.ts
  15:32  error  '_reject' is defined but never used  @typescript-eslint/no-unused-vars
/Users/eduardo.torres/Downloads/COE Operation Nexus/.agent-studio/worktrees/electron-architect-t3/src/apps/resume/services/validationService.ts
   43:36  error  '_
- [TEST] Tests: unknown failure(s). > coe-operation-nexus@0.0.0 test
> vitest run
sh: vitest: command not found

Previous iteration(s):
  Iteration 1: typecheck:FAIL, lint:FAIL, test:FAIL
  Iteration 2: typecheck:FAIL, lint:FAIL, test:FAIL

⚠️ STUCK DETECTION: The same gates have been failing repeatedly. Try a DIFFERENT approach — refactor the code, check imports, or simplify the implementation.

Focus ONLY on fixing the failing gates. Do not introduce new features or changes.
--- END TASK LOOP CONTEXT ---


## Dependency Outputs