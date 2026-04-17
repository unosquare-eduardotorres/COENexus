import { AGENT_IMAGES } from '../assets'

interface AgentBannerProps {
  agentId: string
  agentName: string
  compact?: boolean
}

export default function AgentBanner({ agentId, agentName, compact = false }: AgentBannerProps) {
  const images = AGENT_IMAGES[agentId]
  if (!images) return null

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${compact ? 'h-36' : 'h-48'}`}>
      <img
        src={images.banner}
        alt={`${agentName} banner`}
        className="absolute inset-0 w-full h-full object-cover object-[50%_30%] opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-white/70 dark:from-dark-bg/80 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-4 flex items-end gap-3">
        <img
          src={images.avatar}
          alt={agentName}
          className={`${compact ? 'h-14 w-14 rounded-xl' : 'h-20 w-20 rounded-2xl'} object-cover border-2 border-white/50 dark:border-dark-border/50 shadow-lg`}
        />
        <h1 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-primary pb-0.5`}>{agentName}</h1>
      </div>
    </div>
  )
}
