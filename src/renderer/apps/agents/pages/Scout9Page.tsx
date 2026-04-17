import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import AgentBanner from '../components/AgentBanner'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('Scout9Page')

export default function Scout9Page() {
  useEffect(() => {
    log.info('Scout-9 page viewed')
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <AgentBanner agentId="scout-9" agentName="Scout-9" compact />
      <Outlet />
    </div>
  )
}
