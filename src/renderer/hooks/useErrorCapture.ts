import { useEffect } from 'react'
import { useToast } from '../shared/components/ToastContext'

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function useErrorCapture() {
  const { showToast } = useToast()

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      event.preventDefault()
      const message = event.error?.message ?? event.message ?? 'Unknown renderer error'
      try {
        window.api?.bug?.report({
          message,
          stack: event.error?.stack,
          scope: 'Renderer',
          url: window.location.hash,
        })
      } catch { /* never crash */ }
      showToast(`🐛 ${truncate(message, 120)}`, 'error', 6000)
    }

    function handleRejection(event: PromiseRejectionEvent) {
      event.preventDefault()
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      try {
        window.api?.bug?.report({
          message,
          stack: reason instanceof Error ? reason.stack : undefined,
          scope: 'Renderer',
          url: window.location.hash,
        })
      } catch { /* never crash */ }
      showToast(`🐛 ${truncate(message, 120)}`, 'error', 6000)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [showToast])
}
