import { useState, useCallback } from 'react'

interface FinalizeActionsProps {
  htmlContent: string
  onSave: () => Promise<void>
  onGenerateHtml: () => Promise<void>
  hasHtml: boolean
  saving: boolean
}

export default function FinalizeActions({ htmlContent, onSave, onGenerateHtml, hasHtml, saving }: FinalizeActionsProps) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const plainBlob = new Blob([htmlContent.replace(/<[^>]*>/g, '')], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainBlob,
        }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = htmlContent
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }, [htmlContent])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      await onGenerateHtml()
    } finally {
      setGenerating(false)
    }
  }, [onGenerateHtml])

  return (
    <div className="glass-panel-subtle p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!hasHtml ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-accent-600 hover:bg-accent-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {generating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Generate Email HTML
            </button>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="bg-accent-600 hover:bg-accent-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button onClick={handleGenerate} disabled={generating} className="glass-button px-4 py-2.5 text-sm">
                Regenerate
              </button>
            </>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="glass-button px-5 py-2.5 text-sm flex items-center gap-2"
        >
          {saving && <div className="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />}
          Save Session
        </button>
      </div>
      {copied && (
        <div className="mt-3 p-2 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm text-center">
          ✓ Rich HTML copied to clipboard — paste directly into Outlook or Gmail
        </div>
      )}
    </div>
  )
}
