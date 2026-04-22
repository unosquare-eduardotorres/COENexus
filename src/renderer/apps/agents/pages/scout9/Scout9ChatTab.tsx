import { useCallback, useEffect, useRef, useState } from 'react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import { scout9Service } from '../../services/scout9Service'
import SalaryFeasibilityBadge from '../../components/scout9/SalaryFeasibilityBadge'
import CountryFeasibilityMatrix from '../../components/scout9/CountryFeasibilityMatrix'
import { AGENT_IMAGES } from '../../assets'

const log = createRendererLogger('Scout9ChatTab')

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
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse [animation-delay:240ms]" />
    </div>
  )
}

function parseSalaryBadges(content: string): Array<{
  verdict: 'feasible' | 'marginal' | 'not-feasible' | 'unknown'
  amount: string
  margin?: string
}> {
  const badges: Array<{ verdict: 'feasible' | 'marginal' | 'not-feasible' | 'unknown'; amount: string; margin?: string }> = []
  const feasibleMatch = content.match(/feasible[^$]*?\$([0-9,]+)\/mo[^)]*?(\d+%\s*margin)?/gi)
  const marginalMatch = content.match(/marginal[^$]*?\$([0-9,]+)\/mo/gi)
  const notFeasibleMatch = content.match(/not[- ]feasible[^$]*?\$([0-9,]+)\/mo/gi)

  feasibleMatch?.forEach(m => {
    const amt = m.match(/\$([0-9,]+)/)?.[1]
    const mrg = m.match(/(\d+%)\s*margin/)?.[1]
    if (amt) badges.push({ verdict: 'feasible', amount: `$${amt}/mo`, margin: mrg })
  })
  marginalMatch?.forEach(m => {
    const amt = m.match(/\$([0-9,]+)/)?.[1]
    if (amt) badges.push({ verdict: 'marginal', amount: `$${amt}/mo` })
  })
  notFeasibleMatch?.forEach(m => {
    const amt = m.match(/\$([0-9,]+)/)?.[1]
    if (amt) badges.push({ verdict: 'not-feasible', amount: `$${amt}/mo` })
  })

  return badges
}

function parseCountryMatrix(content: string): Array<{ country: string; seniority: string; verdict: string }> | null {
  try {
    const matrixMatch = content.match(/\[[\s\S]*?"country"[\s\S]*?"seniority"[\s\S]*?"verdict"[\s\S]*?\]/g)
    if (matrixMatch) {
      const parsed = JSON.parse(matrixMatch[0])
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].country) {
        return parsed
      }
    }
  } catch {
    // Not a matrix
  }
  return null
}

export default function Scout9ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [thinkingStep, setThinkingStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    log.info('Scout-9 Chat tab viewed')
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    const cleanup = scout9Service.onChatStepEvent((step) => {
      setThinkingStep(step === 'Done' ? null : step)
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

    try {
      const result = await scout9Service.chat({ message: content })
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
      log.error('Scout9 chat failed', { error: errorMsg })
    } finally {
      setIsLoading(false)
      setThinkingStep(null)
    }
  }, [input])

  const handleClear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const agentAvatar = AGENT_IMAGES['scout-9']?.avatar

  return (
    <section className="glass-panel h-[calc(100vh-220px)] rounded-2xl p-4 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b minimal-divider">
        <div className="flex items-center gap-2">
          {agentAvatar && <img src={agentAvatar} alt="Scout-9" className="h-5 w-5 rounded-full object-cover" />}
          <h3 className="text-sm font-semibold text-primary">Scout-9 Chat</h3>
          <span className="text-xs text-muted">Ask about candidates, salary feasibility, or staffing strategy</span>
        </div>
        <button onClick={handleClear} className="glass-button h-8 px-3 text-xs text-secondary" disabled={isLoading}>
          Clear
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && (
          <div className="glass-panel-subtle rounded-xl p-4 text-xs text-muted space-y-2">
            <p className="font-medium text-secondary">Try asking Scout-9:</p>
            <ul className="space-y-1 ml-2">
              <li>&quot;Which candidates can fit the Axos Senior React position?&quot;</li>
              <li>&quot;Show me the salary feasibility matrix for position 12345&quot;</li>
              <li>&quot;Compare FTE vs contractor costs for candidates in Bolivia&quot;</li>
              <li>&quot;What are JSmith&apos;s hiring preferences at Axos?&quot;</li>
            </ul>
          </div>
        )}

        {messages.map(message => {
          const isUser = message.role === 'user'
          const salaryBadges = !isUser ? parseSalaryBadges(message.content) : []
          const countryMatrix = !isUser ? parseCountryMatrix(message.content) : null

          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'gap-2 justify-start'}`}>
              {!isUser && agentAvatar && (
                <img
                  src={agentAvatar}
                  alt="Scout-9"
                  className="h-6 w-6 rounded-full object-cover mt-1 flex-shrink-0"
                />
              )}
              <div className={`max-w-[85%] space-y-2`}>
                <div className={`rounded-2xl px-3 py-2 ${isUser ? 'glass-button text-primary' : 'glass-panel-subtle text-secondary'}`}>
                  <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {message.toolCalls !== undefined && message.toolCalls > 0 && (
                      <span className="text-[10px] text-muted">• {message.toolCalls} tool call{message.toolCalls !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {salaryBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {salaryBadges.map((badge, i) => (
                      <SalaryFeasibilityBadge
                        key={i}
                        verdict={badge.verdict}
                        amount={badge.amount}
                        margin={badge.margin}
                      />
                    ))}
                  </div>
                )}

                {countryMatrix && (
                  <div className="px-1">
                    <CountryFeasibilityMatrix entries={countryMatrix} />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            {agentAvatar && (
              <img
                src={agentAvatar}
                alt="Scout-9"
                className="h-6 w-6 rounded-full object-cover mt-1 flex-shrink-0"
              />
            )}
            <div className="glass-panel-subtle rounded-2xl px-3 py-2 text-xs text-secondary">
              {thinkingStep ? (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                  <span className="italic">{thinkingStep}</span>
                </div>
              ) : loadingDots()}
            </div>
          </div>
        )}

        {error && (
          <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
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
          placeholder="Ask Scout-9 about candidates, positions, or salary feasibility..."
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
