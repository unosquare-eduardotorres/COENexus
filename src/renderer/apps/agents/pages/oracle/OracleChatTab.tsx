import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import { oracleService } from '../../services/oracleService'
import { AGENT_IMAGES, NEXUS_USER_AVATAR } from '../../assets'

const log = createRendererLogger('OracleChatTab')

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

const EMPTY_STATE_QUESTIONS = [
  'How many open positions are there right now?',
  "What's the current bench rate?",
  'Show all high-attrition-risk reallocations',
  'Which accounts have the most open positions?',
]

export default function OracleChatTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [thinkingStep, setThinkingStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const streamingIdRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingQuestionRef = useRef<string | null>(null)

  useEffect(() => {
    log.info('Oracle Chat tab viewed')
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const result = await oracleService.listMessages()
      if (result.success && result.data) {
        setMessages(
          result.data.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
            toolCalls: m.toolCalls,
          }))
        )
      }
    } catch (err) {
      log.error('Failed to load Oracle chat history', { error: reportError(err) })
    } finally {
      setHistoryLoaded(true)
    }
  }

  useEffect(() => {
    if (!historyLoaded) return
    const q = searchParams.get('q')
    if (q) {
      pendingQuestionRef.current = q
      setSearchParams({}, { replace: true })
      setInput(q)
    }
  }, [historyLoaded, searchParams, setSearchParams])

  useEffect(() => {
    if (historyLoaded && pendingQuestionRef.current && !isLoading) {
      const question = pendingQuestionRef.current
      pendingQuestionRef.current = null
      sendMessage(question)
    }
  }, [historyLoaded, isLoading])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isLoading, streamingContent])

  useEffect(() => {
    const cleanup = oracleService.onStepEvent((step) => {
      setThinkingStep(step === 'Done' ? null : step)
    })
    return cleanup
  }, [])

  useEffect(() => {
    const cleanup = oracleService.onChunkEvent((text) => {
      setStreamingContent(prev => prev + text)
    })
    return cleanup
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    setInput('')
    setError(null)

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setThinkingStep(null)
    streamingIdRef.current = `streaming-${Date.now()}`
    setStreamingContent('')

    try {
      const result = await oracleService.sendMessage(trimmed)
      if (result.success && result.data) {
        const assistantMessage: ChatMessage = {
          id: result.data.id,
          role: 'assistant',
          content: result.data.content,
          timestamp: result.data.created_at,
          toolCalls: result.data.toolCalls,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      const errorMsg = reportError(err)
      setError(errorMsg)
      log.error('Oracle chat failed', { error: errorMsg })
    } finally {
      setIsLoading(false)
      setThinkingStep(null)
      streamingIdRef.current = null
      setStreamingContent('')
    }
  }, [])

  const handleSend = useCallback(() => {
    void sendMessage(input)
  }, [input, sendMessage])

  const handleClear = useCallback(async () => {
    try {
      await oracleService.clearMessages()
      setMessages([])
      setError(null)
    } catch (err) {
      log.error('Failed to clear Oracle messages', { error: reportError(err) })
    }
  }, [])

  const agentAvatar = AGENT_IMAGES['oracle']?.avatar

  return (
    <section className="glass-panel h-[calc(100vh-220px)] rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b minimal-divider">
        <div className="flex items-center gap-2">
          {agentAvatar && <img src={agentAvatar} alt="Oracle" className="h-8 w-8 rounded-full object-cover" />}
          <h3 className="text-base font-semibold text-primary">Oracle Chat</h3>
          <span className="text-sm text-muted">Ask about positions, candidates, employees, or operational metrics</span>
        </div>
        <button onClick={handleClear} className="glass-button h-8 px-3 text-xs text-secondary" disabled={isLoading}>
          Clear
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="glass-panel-subtle rounded-xl p-4 text-sm text-muted space-y-2">
            <p className="font-medium text-secondary">Try asking Oracle:</p>
            <ul className="space-y-1 ml-2">
              {EMPTY_STATE_QUESTIONS.map(q => (
                <li key={q}>
                  <button
                    onClick={() => void sendMessage(q)}
                    className="text-left hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    &quot;{q}&quot;
                  </button>
                </li>
              ))}
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
                  alt="Oracle"
                  className="h-10 w-10 rounded-full object-cover mt-1 flex-shrink-0"
                />
              )}
              <div className="max-w-[85%]">
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
                alt="Oracle"
                className="h-10 w-10 rounded-full object-cover mt-1 flex-shrink-0"
              />
            )}
            <div className="glass-panel-subtle rounded-2xl px-3 py-2 text-sm text-secondary max-w-[85%]">
              {streamingContent ? (
                <p className="whitespace-pre-wrap break-words">{streamingContent}<span className="inline-block w-1.5 h-4 bg-cyan-500 animate-pulse ml-0.5 align-middle" /></p>
              ) : thinkingStep ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
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
              void sendMessage(input)
            }
          }}
          placeholder="Ask Oracle about positions, candidates, or operational metrics..."
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
