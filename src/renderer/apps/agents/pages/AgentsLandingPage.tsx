import AgentLandingHero from '../components/AgentLandingHero'
import { AGENTS_DATA } from '../types'
import { AGENT_IMAGES } from '../assets'
import { useNavigate } from 'react-router-dom'

export default function AgentsLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <AgentLandingHero />

      <div>
        <h2 className="text-lg font-semibold text-primary mb-4">Agent Roster</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS_DATA.map(agent => (
            <button
              key={agent.id}
              onClick={() => navigate(`/agents/${agent.id}`)}
              className="glass-card-hover p-4 text-left group relative overflow-hidden"
            >
              <div
                className="absolute -left-6 -top-6 h-24 w-24 rounded-full blur-3xl opacity-15"
                style={{ background: agent.accentColor }}
              />
              <div className="relative flex items-start gap-3">
                <img
                  src={AGENT_IMAGES[agent.id]?.avatar}
                  alt={agent.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-primary">{agent.name}</h3>
                  <p className="mt-1 text-xs text-muted line-clamp-2">{agent.description}</p>
                  {agent.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.skills.map(skill => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
