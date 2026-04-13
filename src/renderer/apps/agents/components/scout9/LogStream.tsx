import { useRef, useEffect, useState } from 'react'

export interface LogEntry {
  timestamp: string
  source: 'step' | 'tool' | 'ai' | 'error' | 'info'
  message: string
}

interface LogStreamProps {
  logs: LogEntry[]
}

const SOURCE_COLORS: Record<string, string> = {
  step: 'bg-blue-500/20 text-blue-400',
  tool: 'bg-green-500/20 text-green-400',
  ai: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-gray-500/20 text-gray-400',
}

export default function LogStream({ logs }: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  function handleScroll() {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(isNearBottom)
  }

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-primary">Event Log</h4>
        {!autoScroll && (
          <button
            onClick={() => setAutoScroll(true)}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            Resume auto-scroll
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-64 overflow-y-auto rounded-lg border border-white/10 dark:border-dark-border/30 bg-white/20 dark:bg-dark-surface/40 p-2 space-y-0.5"
      >
        {logs.length === 0 && (
          <p className="text-xs text-muted py-4 text-center">No events yet. Start a pipeline run to see logs.</p>
        )}
        {logs.slice(-500).map((entry, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="text-[9px] text-muted font-mono whitespace-nowrap mt-0.5">
              {entry.timestamp}
            </span>
            <span className={`text-[9px] font-semibold uppercase px-1 py-0.5 rounded ${SOURCE_COLORS[entry.source] ?? SOURCE_COLORS.info}`}>
              {entry.source}
            </span>
            <span className="text-[11px] font-mono text-secondary break-all">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
