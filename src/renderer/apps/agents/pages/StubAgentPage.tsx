import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Square } from 'lucide-react'
import AgentBanner from '../components/AgentBanner'
import AgentStepStream from '../components/AgentStepStream'
import { AGENTS_DATA } from '../types'

export default function StubAgentPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [isRunning, setIsRunning] = useState(false)

  const agent = useMemo(() => AGENTS_DATA.find(item => item.id === agentId), [agentId])

  useEffect(() => {
    if (!isRunning) return
    const timeout = window.setTimeout(() => setIsRunning(false), 10000)
    return () => window.clearTimeout(timeout)
  }, [isRunning])

  const handleRun = async () => {
    if (!agentId || isRunning) return

    setIsRunning(true)
    try {
      await window.api?.agents?.runStub?.({ agentId })
    } catch {
      setIsRunning(false)
    }
  }

  if (!agentId || !agent) {
    return (
      <div className="glass-panel p-6 rounded-2xl">
        <p className="text-sm text-muted">Agent not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <AgentBanner agentId={agent.id} agentName={agent.name} compact />

      <div className="glass-panel p-4 rounded-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-primary">{agent.name} Control</h3>
            <p className="text-xs text-secondary mt-1">Run a stub execution to stream live agent progress.</p>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`glass-button px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              isRunning
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
            }`}
          >
            {isRunning ? <Square size={14} /> : <Play size={14} />}
            {isRunning ? 'Running...' : `Run ${agent.name}`}
          </button>
        </div>
      </div>

      <AgentStepStream agentId={agent.id} agentName={agent.name} />
    </div>
  )
}
