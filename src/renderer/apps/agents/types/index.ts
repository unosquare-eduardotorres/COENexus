export interface Agent {
  id: string
  name: string
  description: string
  skills: string[]
  status: 'active' | 'coming-soon'
  accentColor: string
  icon: string
}

export const AGENTS_DATA: Agent[] = [
  {
    id: 'scout-9',
    name: 'Scout-9',
    description: 'Scans the horizon for open positions and matches talent to opportunities. Aggregates job data, identifies best-fit candidates, and surfaces high-priority openings.',
    skills: ['position-scanning', 'talent-matching', 'opportunity-ranking'],
    status: 'active',
    accentColor: '#3b82f6',
    icon: 'Search',
  },
  {
    id: 'vigil',
    name: 'Vigil',
    description: 'Autonomous data synchronization sentinel...',
    skills: ['scheduled-sync', 'data-freshness', 'activity-monitoring'],
    status: 'active',
    accentColor: '#94a3b8',
    icon: 'Radar',
  },
  {
    id: 'switchboard',
    name: 'Switchboard',
    description: 'Routes talent across projects — reallocations, transfers, and team rebalancing. Optimizes resource distribution and manages transition workflows.',
    skills: ['reallocation-engine', 'transfer-routing', 'team-balancing'],
    status: 'active',
    accentColor: '#f59e0b',
    icon: 'Shuffle',
  },
  {
    id: 'sensei',
    name: 'Sensei',
    description: 'Guides personalized learning journeys, skill development, and growth paths. Recommends courses, certifications, and mentorship opportunities.',
    skills: ['learning-paths', 'skill-assessment', 'growth-planning'],
    status: 'active',
    accentColor: '#10b981',
    icon: 'GraduationCap',
  },
  {
    id: 'payday',
    name: 'Payday',
    description: 'Calculates quarterly bonuses, tracks performance metrics, and manages reward distribution. Provides transparent compensation insights and forecasting.',
    skills: ['bonus-calculation', 'performance-metrics', 'reward-distribution'],
    status: 'active',
    accentColor: '#ec4899',
    icon: 'Trophy',
  },
]
