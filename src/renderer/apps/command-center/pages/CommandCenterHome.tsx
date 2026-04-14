import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { reportService } from '../services/reportService'

function BarChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ArrowsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

interface SyncStatus {
  total: number
  lastSyncedAt: string | null
}

const reports = [
  {
    title: 'Open Positions',
    description: 'Track and evaluate open positions with configurable staleness criteria, aging analysis, and actionable flags for COE and CGX teams.',
    href: '/command-center/open-positions',
    available: true,
    icon: <BarChartIcon />,
    iconBg: 'from-emerald-500/15 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500 dark:border-emerald-400',
    ctaText: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Placements',
    description: 'Monitor placement pipeline, track candidate assignments, and analyze placement velocity across accounts and practices.',
    href: '/command-center/placements',
    available: false,
    icon: <UsersIcon />,
    iconBg: 'from-violet-500/15 to-violet-600/10 dark:from-violet-500/20 dark:to-violet-600/15',
    iconText: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-500 dark:border-violet-400',
    ctaText: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Project Reallocation',
    description: 'Identify reallocation opportunities, track employee transitions between projects, and optimize resource utilization.',
    href: '/command-center/reallocation',
    available: true,
    icon: <ArrowsIcon />,
    iconBg: 'from-amber-500/15 to-amber-600/10 dark:from-amber-500/20 dark:to-amber-600/15',
    iconText: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500 dark:border-amber-400',
    ctaText: 'text-amber-600 dark:text-amber-400',
  },
]

export default function CommandCenterHome() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)

  useEffect(() => {
    reportService.getSyncStatus().then(setSyncStatus).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 dark:bg-emerald-400/15 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 dark:text-emerald-400">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary">C.O.R.E.</h1>
        <p className="text-sm text-secondary max-w-lg mx-auto">
          COE Operational Reports & Evaluation — centralized reporting for open positions, placements, and resource reallocation across the organization.
        </p>
      </div>

      {syncStatus && (
        <div className="flex items-center justify-center gap-6">
          <div className="glass-panel-subtle px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${syncStatus.lastSyncedAt ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs text-muted">Synced Positions</span>
            </div>
            <span className="text-sm font-mono font-semibold text-primary">{syncStatus.total}</span>
          </div>
          {syncStatus.lastSyncedAt && (
            <div className="glass-panel-subtle px-4 py-3 flex items-center gap-3">
              <span className="text-xs text-muted">Last Sync</span>
              <span className="text-sm font-mono text-primary">
                {new Date(syncStatus.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map(report => (
          <div key={report.title} className="relative group">
            {report.available ? (
              <Link
                to={report.href}
                className={`block glass-card-hover p-6 h-full border-t-2 ${report.borderColor} transition-all`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.iconBg} flex items-center justify-center mb-4 ${report.iconText}`}>
                  {report.icon}
                </div>
                <h3 className="text-base font-semibold text-primary mb-2">{report.title}</h3>
                <p className="text-sm text-secondary leading-relaxed mb-4">{report.description}</p>
                <span className={`text-sm font-medium ${report.ctaText}`}>
                  View Report →
                </span>
              </Link>
            ) : (
              <div className="glass-card p-6 h-full opacity-60 cursor-not-allowed">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.iconBg} flex items-center justify-center mb-4 ${report.iconText} opacity-50`}>
                  {report.icon}
                </div>
                <h3 className="text-base font-semibold text-primary mb-2">{report.title}</h3>
                <p className="text-sm text-secondary leading-relaxed mb-4">{report.description}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-medium text-amber-400">Coming Soon</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
