import { useEffect } from 'react'
import { useToast } from '../shared/components/ToastContext'

export function useErrorToastListener() {
  const { showToast } = useToast()

  useEffect(() => {
    const unsubscribe = window.api?.bug?.onNewError?.((data) => {
      const msg = data.entry.message
      const truncated = msg.length > 120 ? msg.slice(0, 120) + '…' : msg
      showToast(`🐛 [${data.entry.scope}] ${truncated}`, 'error', 6000)
    })
    return () => { unsubscribe?.() }
  }, [showToast])
}
