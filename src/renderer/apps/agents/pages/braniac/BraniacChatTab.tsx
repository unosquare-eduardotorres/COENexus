import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import { braniacService } from '../../services/braniacService'
import { AGENT_IMAGES, NEXUS_USER_AVATAR } from '../../assets'

const log = createRendererLogger('BraniacChatTab')

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolCalls?: number
}

function loadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
      <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse [animation-delay:120ms]" />
      <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse [animation-delay:240ms]" />
    </div>
  )
}

export default function BraniacChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [thinkingStep, setThinkingStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [accounts, setAccounts] = useState<string[]>([])
  const [scopeAccount, setScopeAccount] = useState<string>('')
  const streamingIdRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    log.info('Braniac Chat tab viewed')
    braniacService.getAccounts().then(res => {
      if (res.success && res.data) setAccounts(res.data)
    })
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isLoading, streamingContent])

  useEffect(() => {
    const cleanup = braniacService.onChatStepEvent((step) => {
      setThinkingStep(step === 'Done' ? null : step)
    })
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = braniacService.onChatChunkEvent((text) => {
      setStreamingContent(prev => prev + text)
    })
    return cleanup
  }, [])

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content) return
    setInput('')
    setError(null)

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setThinkingStep(null)
    streamingIdRef.current = `streaming-${Date.now()}`
    setStreamingContent('')

    try {
      const result = await braniacService.chat({
        message: content,
        scopeAccount: scopeAccount || undefined,
      })
      if (result.success && result.data) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.data.content,
          timestamp: new Date().toISOString(),
          toolCalls: result.data.toolCalls,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      const errorMsg = reportError(err)
      setError(errorMsg)
      log.error('Braniac chat failed', { error: errorMsg })
    } finally {
      setIsLoading(false)
      setThinkingStep(null)
      streamingIdRef.current = null
      setStreamingContent('')
    }
  }, [input, scopeAccount])

  const handleClear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const agentAvatar = AGENT_IMAGES['braniac']?.avatar

  return (
    <section className="glass-panel h-[calc(100vh-220px)] rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b minimal-divider">
        <div className="flex items-center gap-2">
          {agentAvatar && <img src={agentAvatar} alt="Braniac" className="h-8 w-8 rounded-full object-cover" />}
          <h3 className="text-base font-semibold text-primary">Braniac Chat</h3>
          <span className="text-sm text-muted">Ask about hiring patterns, stakeholder preferences, or account insights</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={scopeAccount}
              onChange={(e) => setScopeAccount(e.target.value)}
              className="glass-select text-xs pr-7 h-8"
              disabled={isLoading}
            >
              <option value="">All accounts</option>
              {accounts.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted pointer-events-none" />
          </div>
          <button onClick={handleClear} className="glass-button h-8 px-3 text-xs text-secondary" disabled={isLoading}>
            Clear
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && (
          <div className="glass-panel-subtle rounded-xl p-4 text-sm text-muted space-y-2">
            <p className="font-medium text-secondary">Try asking Braniac:</p>
            <ul className="space-y-1 ml-2">
              <li>&quot;What are the hiring patterns for the 3E account?&quot;</li>
              <li>&quot;Compare rate preferences across stakeholders&quot;</li>
              <li>&quot;Which countries get rejected most often?&quot;</li>
              <li>&quot;What&apos;s the typical decision speed for Mark Del Villan?&quot;</li>
              <li>&quot;Show me all pending patterns that need review&quot;</li>
            </ul>
          </div>
        )}

        {messages.map(message => {
          const isUser = message.role === 'user'

          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end gap-2' : 'gap-2 justify-start'}`}>
              {!isUser && agentAvatar && (
                <img
                  src={agentAvatar}
                  alt="Braniac"
                  className="h-10 w-10 rounded-full object-cover mt-1 flex-shrink-0"
                />
              )}
              <div className="max-w-[85%] space-y-2">
                <div className={`rounded-2xl px-3 py-2 ${isUser ? 'glass-button text-primary' : 'glass-panel-subtle text-secondary'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {message.toolCalls !== undefined && message.toolCalls > 0 && (
                      <span className="text-xs text-muted">• {message.toolCalls} tool call{message.toolCalls !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
              {isUser && (
                <img
                  src={NEXUS_USER_AVATAR}
                  alt="You"
                  className="h-10 w-10 rounded-full object-cover mt-1 flex-shrink-0"
                />
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            {agentAvatar && (
              <img
                src={agentAvatar}
                alt="Braniac"
                className="h-10 w-10 rounded-full object-cover mt-1 flex-shrink-0"
              />
            )}
            <div className="glass-panel-subtle rounded-2xl px-3 py-2 text-sm text-secondary max-w-[85%]">
              {streamingContent ? (
                <p className="whitespace-pre-wrap break-words">{streamingContent}<span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" /></p>
              ) : thinkingStep ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="italic">{thinkingStep}</span>
                </div>
              ) : loadingDots()}
            </div>
          </div>
        )}

        {error && (
          <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t minimal-divider flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder="Ask Braniac about hiring patterns, stakeholder preferences, or account insights..."
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
