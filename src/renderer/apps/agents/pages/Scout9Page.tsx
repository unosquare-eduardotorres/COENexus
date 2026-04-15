import { Outlet } from 'react-router-dom'
import AgentBanner from '../components/AgentBanner'

export default function Scout9Page() {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <AgentBanner agentId="scout-9" agentName="Scout-9" compact />
      <Outlet />
    </div>
  )
}
