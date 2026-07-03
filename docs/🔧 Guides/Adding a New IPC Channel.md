---
tags: [guide, ipc]
---

# 📡 Adding a New IPC Channel

Step-by-step guide for adding a new IPC channel to Operation Nexus.

## Steps

### 1. Define the Channel Constant

Add the channel name to `src/shared/ipc-channels.ts`:

```typescript
export const MY_DOMAIN = {
  MY_ACTION: 'my-domain:my-action',
} as const;
```

### 2. Add the Type to Shared Types

Define request/response types in `src/shared/types.ts`:

```typescript
export interface MyActionRequest {
  param1: string;
  param2: number;
}

export interface MyActionResponse {
  result: string;
}
```

### 3. Create the IPC Handler

Create `src/main/ipc/myDomain.ipc.ts`:

```typescript
import { ipcMain } from 'electron';
import { validateSender } from '../security';
import { MY_DOMAIN } from '../../shared/ipc-channels';

export function registerMyDomainHandlers() {
  ipcMain.handle(MY_DOMAIN.MY_ACTION, async (event, request) => {
    validateSender(event); // REQUIRED first line
    // Business logic here
    return { result: 'done' };
  });
}
```

### 4. Register in Handler Index

Add to `src/main/ipc/index.ts`:

```typescript
import { registerMyDomainHandlers } from './myDomain.ipc';

export function registerAllHandlers() {
  // ... existing registrations
  registerMyDomainHandlers();
}
```

### 5. Expose in Preload

Add to `src/preload/index.ts`:

```typescript
myAction: (request: MyActionRequest) =>
  ipcRenderer.invoke(MY_DOMAIN.MY_ACTION, request),
```

### 6. Create Renderer Service

Create `src/renderer/apps/resume/services/myDomainService.ts`:

```typescript
export async function myAction(request: MyActionRequest): Promise<MyActionResponse> {
  return window.api.myAction(request);
}
```

## Security Checklist

- [ ] `validateSender(event)` is the first line in every handler
- [ ] Input is validated before processing
- [ ] No raw `ipcRenderer` exposed — only typed preload wrappers
- [ ] `contextIsolation: true` is maintained

## Related
- [[IPC Channel Map]]
- [[System Overview]]
