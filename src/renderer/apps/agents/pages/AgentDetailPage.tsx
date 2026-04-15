import { useParams, useNavigate } from 'react-router-dom'
import { AGENTS_DATA } from '../types'
import { AGENT_IMAGES } from '../assets'
import {
  ArrowLeft,
  Zap,
  Shield,
} from 'lucide-react'

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

        <div className="glass-card relative overflow-hidden">
          <div className="h-40 w-full overflow-hidden">
            <img
              src={AGENT_IMAGES[agent.id]?.banner}
              alt={`${agent.name} banner`}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-dark-bg/90 to-transparent" />
          </div>
          <div className="relative px-6 pb-6 -mt-10">
            <div className="flex items-end gap-4">
              <img
                src={AGENT_IMAGES[agent.id]?.avatar}
                alt={agent.name}
                className="h-20 w-20 rounded-2xl object-cover border-4 border-white dark:border-dark-bg shadow-lg"
              />
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-primary">{agent.name}</h1>
                <p className="mt-2 text-sm text-secondary max-w-lg">{agent.description}</p>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mt-2"
                  style={{ backgroundColor: `${agent.accentColor}15`, color: agent.accentColor }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agent.accentColor }} />
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
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

      <div className="glass-card relative overflow-hidden">
        <div className="h-40 w-full overflow-hidden">
          <img
            src={AGENT_IMAGES[agent.id]?.banner}
            alt={`${agent.name} banner`}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-dark-bg/90 to-transparent" />
        </div>

        <div className="relative px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <img
              src={AGENT_IMAGES[agent.id]?.avatar}
              alt={agent.name}
              className="h-20 w-20 rounded-2xl object-cover border-4 border-white dark:border-dark-bg shadow-lg"
            />
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-primary">{agent.name}</h1>
              <p className="mt-1 text-sm text-secondary leading-relaxed max-w-lg">{agent.description}</p>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mt-2"
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
