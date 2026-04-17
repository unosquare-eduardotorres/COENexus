import { useEffect, useRef, useState } from 'react'
import type { VigilChatMessage } from '../../../../../shared/ipc-types'
import { AGENT_IMAGES } from '../../assets'

interface ChatPanelProps {
  messages: VigilChatMessage[]
  onSend: (content: string) => Promise<void> | void
  onClear: () => Promise<void> | void
  isLoading: boolean
  thinkingStep?: string | null
}

function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null
  try {
    const parsed = JSON.parse(metadata)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

function loadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse [animation-delay:240ms]" />
    </div>
  )
}

export default function ChatPanel({ messages, onSend, onClear, isLoading, thinkingStep }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [messages, isLoading])

  async function handleSend() {
    const content = input.trim()
    if (!content) return
    setInput('')
    await onSend(content)
  }

  return (
    <section className="glass-panel h-full rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b minimal-divider">
        <div className="flex items-center gap-2">
          <img src={AGENT_IMAGES['vigil']?.avatar} alt="Vigil" className="h-5 w-5 rounded-full object-cover" />
          <h3 className="text-sm font-semibold text-primary">Vigil Chat</h3>
        </div>
        <button onClick={onClear} className="glass-button h-8 px-3 text-xs text-secondary" disabled={isLoading}>
          Clear
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && (
          <div className="glass-panel-subtle rounded-xl p-3 text-xs text-muted">No conversation yet. Ask Vigil for status, sync actions, or guidance.</div>
        )}

        {messages.map(message => {
          const isUser = message.role === 'user'
          const metadata = parseMetadata(message.metadata_json)
          const proposedAction = metadata?.proposedAction

          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'gap-2 justify-start'}`}>
              {!isUser && (
                <img
                  src={AGENT_IMAGES['vigil']?.avatar}
                  alt="Vigil"
                  className="h-6 w-6 rounded-full object-cover mt-1 flex-shrink-0"
                />
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isUser ? 'glass-button text-primary' : 'glass-panel-subtle text-secondary'}`}>
                <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-[10px] text-muted mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                {proposedAction && typeof proposedAction === 'object' && (
                  <div className="mt-2 glass-card rounded-xl p-2">
                    <p className="text-[11px] font-semibold text-primary">Action confirmation</p>
                    <p className="text-[10px] text-muted mt-0.5 break-words">{JSON.stringify(proposedAction)}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <img
              src={AGENT_IMAGES['vigil']?.avatar}
              alt="Vigil"
              className="h-6 w-6 rounded-full object-cover mt-1 flex-shrink-0"
            />
            <div className="glass-panel-subtle rounded-2xl px-3 py-2 text-xs text-secondary">
              {thinkingStep ? (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
                  <span className="italic">{thinkingStep}</span>
                </div>
              ) : loadingDots()}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t minimal-divider flex items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          placeholder="Send a message to Vigil"
          className="glass-input h-10 px-3 text-sm flex-1"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="glass-button h-10 px-4 text-sm font-semibold text-primary disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  )
}
