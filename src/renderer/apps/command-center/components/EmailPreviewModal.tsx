/**
 * EmailPreviewModal — large modal preview of the email HTML + action cards.
 * Card 1: Copy to Clipboard (copies rich HTML + plain text)
 * Card 2: Send via Email (coming soon, disabled)
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  html: string
  plainText: string
}

export default function EmailPreviewModal({ open, onClose, html, plainText }: Props) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Reset copied state when modal reopens
  useEffect(() => {
    if (open) setCopied(false)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [open])

  const handleCopy = useCallback(async () => {
    try {
      // Primary: rich HTML + plain text via Clipboard API
      const htmlBlob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([plainText], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ])
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback: use a hidden contentEditable div + execCommand to copy rich HTML
      // This works reliably in Electron where navigator.clipboard.write() is blocked
      try {
        const container = document.createElement('div')
        container.setAttribute('contenteditable', 'true')
        container.innerHTML = html
        container.style.position = 'fixed'
        container.style.left = '-9999px'
        container.style.top = '-9999px'
        container.style.opacity = '0'
        document.body.appendChild(container)

        const range = document.createRange()
        range.selectNodeContents(container)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        document.execCommand('copy')

        selection?.removeAllRanges()
        document.body.removeChild(container)

        setCopied(true)
        timerRef.current = setTimeout(() => setCopied(false), 3000)
      } catch {
        // Last resort: plain text via textarea
        const textarea = document.createElement('textarea')
        textarea.value = plainText
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        timerRef.current = setTimeout(() => setCopied(false), 3000)
      }
    }
  }, [html, plainText])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-[920px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-2xl border border-white/10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-primary">Email Preview</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-secondary transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 overflow-auto px-6 py-4 min-h-0">
          <div className="rounded-lg overflow-hidden border border-white/10 bg-[#F1F5F9]">
            <iframe
              ref={iframeRef}
              srcDoc={html}
              title="Email Preview"
              className="w-full border-0"
              style={{ height: '60vh', minHeight: '400px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Action Cards */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-4">

          {/* Card 1: Copy to Clipboard */}
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left ${
              copied
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
            }`}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              copied ? 'bg-emerald-500/20' : 'bg-blue-500/15'
            }`}>
              {copied ? (
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                </svg>
              )}
            </div>
            {/* Text */}
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${copied ? 'text-emerald-400' : 'text-primary'}`}>
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {copied ? 'Ready to paste into Outlook or Gmail' : 'Paste directly into Outlook or Gmail'}
              </p>
            </div>
          </button>

          {/* Card 2: Send via Email (coming soon) */}
          <div className="flex-1 flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed">
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/5">
              <svg className="w-5 h-5 text-muted" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
              </svg>
            </div>
            {/* Text */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-muted">Send via Email</p>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-muted border border-white/10">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">Send directly from Nexus</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
