import { useNavigate } from 'react-router-dom'
import { Database, Workflow, Sparkles, MessageCircle, ArrowRight, Briefcase, Users, UserSearch, ArrowLeftRight, GitCompare, BarChart3 } from 'lucide-react'
import { AGENT_IMAGES } from '../../assets'

const images = AGENT_IMAGES['oracle']

const DATA_SOURCES = [
  'Synced open positions (from upstream HR API)',
  'Synced employees & bench status',
  'Synced candidates (COE certification, skills, status)',
  'Project reallocations & attrition risk data',
  'Match session history',
  'Open position candidate pipelines',
]

const STEPS = [
  {
    num: '①',
    title: 'Ask a Question',
    desc: 'Type any question about your Nexus data in plain English',
  },
  {
    num: '②',
    title: 'Oracle Queries',
    desc: 'Oracle analyzes your question, selects the right MCP tools, and queries the live database',
  },
  {
    num: '③',
    title: 'Get Insights',
    desc: 'Receive precise, data-grounded answers with key metrics and actionable recommendations',
  },
]

const CATEGORIES = [
  {
    title: 'Open Positions',
    icon: Briefcase,
    examples: [
      'How many open positions does Axos have?',
      'Show positions aging over 60 days',
    ],
  },
  {
    title: 'Employees & Bench',
    icon: Users,
    examples: [
      "What's the current bench rate?",
      'List bench employees with React skills',
    ],
  },
  {
    title: 'Candidates',
    icon: UserSearch,
    examples: [
      'How many COE-certified candidates are in Colombia?',
      'Show candidates for position 12345',
    ],
  },
  {
    title: 'Reallocations & Attrition',
    icon: ArrowLeftRight,
    examples: [
      'Which employees have high attrition risk?',
      'Show PRR transitions this month',
    ],
  },
  {
    title: 'Match History',
    icon: GitCompare,
    examples: [
      'How many match sessions ran last week?',
      'Show completed deep-search sessions',
    ],
  },
  {
    title: 'Aggregate Metrics',
    icon: BarChart3,
    examples: [
      "What's our win rate this quarter?",
      'Show positions by status breakdown',
    ],
  },
]

export default function OracleHomeTab() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="relative w-full overflow-hidden rounded-2xl">
        <img
          src={images.banner}
          alt="Oracle banner"
          className="w-full h-auto object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 dark:from-dark-bg/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-5 flex items-end gap-3">
          <img
            src={images.avatar}
            alt="Oracle"
            className="h-16 w-16 rounded-xl object-cover border-2 border-white/50 dark:border-dark-border/50 shadow-lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-primary">Oracle</h1>
            <p className="text-sm text-secondary">Data Intelligence Analyst</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-cyan-500 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold text-primary">What is Oracle?</h2>
        </div>
        <p className="text-sm text-secondary leading-relaxed">
          Oracle is the conversational data intelligence analyst for Operation Nexus. Ask questions
          in plain English about positions, candidates, employees, and operational metrics — Oracle
          queries the live SQLite database using specialized MCP tools and returns precise, actionable
          answers grounded in real data.
        </p>
      </div>

      <div className="glass-panel p-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Database size={20} className="text-cyan-500 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold text-primary">Data Sources</h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DATA_SOURCES.map(src => (
            <li key={src} className="flex items-start gap-2 text-sm text-secondary">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400 dark:bg-cyan-500 flex-shrink-0" />
              {src}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Workflow size={20} className="text-cyan-500 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold text-primary">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map(step => (
            <div key={step.num} className="glass-card p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{step.num}</span>
                <h3 className="text-sm font-semibold text-primary">{step.title}</h3>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={20} className="text-cyan-500 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold text-primary">What Can Oracle Answer?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <div key={cat.title} className="glass-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <cat.icon size={16} />
                </div>
                <h4 className="text-sm font-semibold text-primary">{cat.title}</h4>
              </div>
              <ul className="space-y-1">
                {cat.examples.map(ex => (
                  <li key={ex} className="text-xs text-muted leading-relaxed">
                    &ldquo;{ex}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('chat')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          Start Chatting
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
