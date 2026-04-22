export interface Agent {
  id: string
  name: string
  description: string
  skills: string[]
  status: 'active' | 'coming-soon'
  accentColor: string
  icon: string
  category: 'interactive' | 'operational'
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
    category: 'interactive',
  },
  {
    id: 'oracle',
    name: 'Oracle',
    description: 'Conversational data intelligence analyst. Ask natural-language questions about positions, candidates, employees, and operational metrics — Oracle queries the live database and returns actionable insights.',
    skills: ['data-querying', 'operational-insights', 'live-analytics'],
    status: 'active',
    accentColor: '#06b6d4',
    icon: 'Sparkles',
    category: 'interactive',
  },
  {
    id: 'vigil',
    name: 'Vigil',
    description: 'Autonomous data synchronization sentinel...',
    skills: ['scheduled-sync', 'data-freshness', 'activity-monitoring'],
    status: 'active',
    accentColor: '#94a3b8',
    icon: 'Radar',
    category: 'operational',
  },
  {
    id: 'braniac',
    name: 'Braniac',
    description: 'Analyzes historical recruitment data to infer stakeholder preferences, rate patterns, and hiring behaviors. Produces pre-computed intelligence profiles for Scout.',
    skills: ['pattern-inference', 'stakeholder-profiling', 'preference-mapping'],
    status: 'active',
    accentColor: '#8b5cf6',
    icon: 'BrainCircuit',
    category: 'operational',
  },
  {
    id: 'switchboard',
    name: 'Switchboard',
    description: 'Routes talent across projects — reallocations, transfers, and team rebalancing. Optimizes resource distribution and manages transition workflows.',
    skills: ['reallocation-engine', 'transfer-routing', 'team-balancing'],
    status: 'active',
    accentColor: '#f59e0b',
    icon: 'Shuffle',
    category: 'operational',
  },
  {
    id: 'sensei',
    name: 'Sensei',
    description: 'Guides personalized learning journeys, skill development, and growth paths. Recommends courses, certifications, and mentorship opportunities.',
    skills: ['learning-paths', 'skill-assessment', 'growth-planning'],
    status: 'active',
    accentColor: '#10b981',
    icon: 'GraduationCap',
    category: 'operational',
  },
  {
    id: 'payday',
    name: 'Payday',
    description: 'Calculates quarterly bonuses, tracks performance metrics, and manages reward distribution. Provides transparent compensation insights and forecasting.',
    skills: ['bonus-calculation', 'performance-metrics', 'reward-distribution'],
    status: 'active',
    accentColor: '#ec4899',
    icon: 'Trophy',
    category: 'operational',
  },
]
