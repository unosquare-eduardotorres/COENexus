import { useEffect, useMemo, useRef, useState } from 'react'
import { AGENT_IMAGES } from '../assets'

type StreamEvent = {
  agentId: string
  step: string
  status: 'started' | 'running' | 'completed' | 'failed' | string
  message: string
  timestamp: string
}

type BubbleStatus = 'thinking' | 'working' | 'done' | 'error'

interface AgentStepStreamProps {
  agentId: string
  agentName: string
  maxBubbles?: number
}

interface StreamBubble {
  id: string
  status: BubbleStatus
  message: string
  step: string
  timestamp: string
}

function toBubbleStatus(status: StreamEvent['status']): BubbleStatus {
  if (status === 'started') return 'thinking'
  if (status === 'running') return 'working'
  if (status === 'completed') return 'done'
  return 'error'
}

function statusIcon(status: BubbleStatus) {
  if (status === 'thinking') return '🤔'
  if (status === 'working') return '⚙️'
  if (status === 'done') return '✅'
  return '❌'
}

export default function AgentStepStream({ agentId, agentName, maxBubbles = 40 }: AgentStepStreamProps) {
  const [bubbles, setBubbles] = useState<StreamBubble[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const image = useMemo(() => AGENT_IMAGES[agentId], [agentId])

  useEffect(() => {
    const unsubscribe = window.api?.agents?.onStepEvent?.((event: StreamEvent) => {
      if (event.agentId !== agentId) return

      const nextBubble: StreamBubble = {
        id: `${event.timestamp}-${event.step}-${Math.random().toString(36).slice(2)}`,
        status: toBubbleStatus(event.status),
        message: event.message,
        step: event.step,
        timestamp: event.timestamp,
      }

      setBubbles(previous => [...previous, nextBubble].slice(-maxBubbles))
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [agentId, maxBubbles])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [bubbles])

  return (
    <section className="glass-panel rounded-2xl p-4 flex flex-col gap-3 min-h-[260px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Live Step Stream</h3>
        <button
          type="button"
          onClick={() => setBubbles([])}
          className="glass-button h-8 px-3 text-xs text-secondary"
        >
          Clear
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {bubbles.length === 0 && (
          <div className="glass-panel-subtle rounded-xl p-3 text-xs text-muted">
            No activity yet. Run {agentName} to see live progress.
          </div>
        )}

        {bubbles.map((bubble) => (
          <div key={bubble.id} className="glass-panel-subtle rounded-2xl p-3">
            <div className="flex items-start gap-3">
              {image?.avatar ? (
                <img
                  src={image.avatar}
                  alt={agentName}
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full glass-button flex items-center justify-center text-[10px] text-primary font-semibold flex-shrink-0">
                  {agentName.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm leading-none">{statusIcon(bubble.status)}</span>
                    <p className="text-xs font-semibold text-primary truncate">{agentName}</p>
                    <p className="text-[11px] text-muted truncate">{bubble.step}</p>
                  </div>
                  <p className="text-[10px] text-muted whitespace-nowrap">
                    {new Date(bubble.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <p className="text-xs text-secondary mt-1 whitespace-pre-wrap break-words">{bubble.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
