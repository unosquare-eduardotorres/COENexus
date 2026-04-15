import { useParams, useNavigate } from 'react-router-dom'
import { AGENTS_DATA } from '../types'
import {
  Search,
  Shuffle,
  GraduationCap,
  Trophy,
  ArrowLeft,
  Zap,
  Shield,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Search: <Search size={32} />,
  Shuffle: <Shuffle size={32} />,
  GraduationCap: <GraduationCap size={32} />,
  Trophy: <Trophy size={32} />,
  Radar: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.07 4.93A10 10 0 1 0 21 12" />
      <path d="M12 12 7 7" />
      <path d="M12 8a4 4 0 0 1 4 4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
}

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const agent = AGENTS_DATA.find(a => a.id === agentId)

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm text-muted">Agent not found</p>
        <button
          onClick={() => navigate('/agents')}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to agents
        </button>
      </div>
    )
  }

  if (agent.id !== 'scout-9') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/agents')}
          className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          All agents
        </button>

        <div className="glass-card p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            {ICON_MAP[agent.icon]}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-primary">{agent.name}</h1>
          <p className="mt-2 text-sm text-secondary max-w-lg mx-auto">
            {agent.name} is being assembled and will be available in a later release cycle.
          </p>
          <button
            onClick={() => navigate('/agents/scout-9')}
            className="mt-5 glass-button px-4 py-2 text-xs font-semibold text-primary"
          >
            Open Scout-9 Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/agents')}
        className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft size={14} />
        All agents
      </button>

      <div className="glass-card p-6 relative overflow-hidden">
        <div
          className="absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-20"
          style={{ background: agent.accentColor }}
        />

        <div className="relative flex items-start gap-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${agent.accentColor}20` }}
          >
            <div style={{ color: agent.accentColor }}>{ICON_MAP[agent.icon]}</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{agent.name}</h1>
            <p className="mt-2 text-sm text-secondary leading-relaxed">{agent.description}</p>

            <div className="mt-4 flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${agent.accentColor}15`,
                  color: agent.accentColor,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agent.accentColor }} />
                {agent.status === 'active' ? 'Active' : 'Coming Soon'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {agent.skills.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-primary">Skills</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map(skill => (
              <span
                key={skill}
                className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-mono text-secondary"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-primary">Capabilities</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="glass-panel-subtle p-4 rounded-lg">
            <h3 className="text-xs font-semibold text-primary mb-1">Delegation</h3>
            <p className="text-xs text-muted">
              {agent.id === 'orchestrator'
                ? 'Coordinates all specialist agents, analyzes requests, and synthesizes results.'
                : 'Receives delegated tasks from the Orchestrator based on domain expertise.'}
            </p>
          </div>
          <div className="glass-panel-subtle p-4 rounded-lg">
            <h3 className="text-xs font-semibold text-primary mb-1">Integration</h3>
            <p className="text-xs text-muted">
              {agent.skills.length > 0
                ? `Leverages ${agent.skills.length} specialized skill${agent.skills.length > 1 ? 's' : ''} for enhanced capabilities.`
                : 'Uses core reasoning capabilities without specialized skill augmentation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
