import type { IpcMainInvokeEvent } from 'electron'

export function validateSender(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame.url
  if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
    throw new Error('Unauthorized IPC sender')
  }
}
