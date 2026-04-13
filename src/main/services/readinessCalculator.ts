import { createLogger } from './logger'

const log = createLogger('ReadinessCalculator')

export interface SkillProgressInput {
  domainId: string
  progress: number
  isCoreGate: boolean
}

export interface GateStatusInput {
  gateId: string
  status: 'not-started' | 'in-progress' | 'met' | 'blocked'
}

export interface ReadinessResult {
  score: number
  coreGatesBlocking: boolean
  coreGateStatuses: Array<{ name: string; status: string }>
  nonGateProgress: number
  blockingMessage?: string
}

export function calculateReadiness(
  skillProgress: SkillProgressInput[],
  gateStatuses: GateStatusInput[]
): ReadinessResult {
  const coreGates = gateStatuses.map(g => ({ name: g.gateId, status: g.status }))
  const blockingGates = gateStatuses.filter(g => g.status !== 'met')
  const coreGatesBlocking = blockingGates.length > 0

  const nonGateSkills = skillProgress.filter(s => !s.isCoreGate)
  const nonGateProgress = nonGateSkills.length > 0
    ? Math.round(nonGateSkills.reduce((sum, s) => sum + s.progress, 0) / nonGateSkills.length)
    : 0

  const coreSkills = skillProgress.filter(s => s.isCoreGate)
  const coreProgress = coreSkills.length > 0
    ? Math.round(coreSkills.reduce((sum, s) => sum + s.progress, 0) / coreSkills.length)
    : 0

  let score = Math.round(coreProgress * 0.6 + nonGateProgress * 0.4)
  if (coreGatesBlocking) {
    score = Math.min(score, 60)
  }

  const blockingMessage = coreGatesBlocking
    ? `${blockingGates.length} core gate${blockingGates.length > 1 ? 's are' : ' is'} blocking`
    : undefined

  log.info('Readiness calculated', { score, coreGatesBlocking, nonGateProgress, blockingCount: blockingGates.length })

  return {
    score,
    coreGatesBlocking,
    coreGateStatuses: coreGates,
    nonGateProgress,
    blockingMessage,
  }
}
