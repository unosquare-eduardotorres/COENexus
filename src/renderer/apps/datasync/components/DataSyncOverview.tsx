import { useState, useEffect } from 'react'
import { databaseSharingService, type DatabaseStatus } from '../services/databaseSharingService'
import type { DataSyncPanel } from './DataSyncLayout'

interface DataSyncOverviewProps {
  onNavigate: (panel: DataSyncPanel) => void
}

const sources: Array<{
  id: DataSyncPanel
  title: string
  description: string
  table: string
  iconBg: string
  iconText: string
  icon: JSX.Element
}> = [
  {
    id: 'employees',
    title: 'Employees',
    description: 'Sync active employee records from upstream HR systems for matching and resource planning.',
    table: 'synced_employees',
    iconBg: 'from-blue-500/15 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/15',
    iconText: 'text-blue-600 dark:text-blue-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    id: 'candidates',
    title: 'Candidates',
    description: 'Import candidate profiles and resumes for AI-powered matching against open positions.',
    table: 'synced_candidates',
    iconBg: 'from-violet-500/15 to-violet-600/10 dark:from-violet-500/20 dark:to-violet-600/15',
    iconText: 'text-violet-600 dark:text-violet-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: 'open-positions',
    title: 'Open Positions',
    description: 'Sync open position data for the C.O.R.E. staleness report and match engine workflows.',
    table: 'synced_open_positions',
    iconBg: 'from-emerald-500/15 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    id: 'placement-margin',
    title: 'Placement Margin',
    description: 'Sync placement margin data from the Exec API for the COE Bonus report.',
    table: 'synced_placement_margins',
    iconBg: 'from-teal-500/15 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/15',
    iconText: 'text-teal-600 dark:text-teal-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    id: 'offboarding',
    title: 'Offboarding',
    description: 'Sync year-to-date professional offboarding data from the Exec API.',
    table: 'synced_offboardings',
    iconBg: 'from-rose-500/15 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/15',
    iconText: 'text-rose-600 dark:text-rose-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
]

export default function DataSyncOverview({ onNavigate }: DataSyncOverviewProps) {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)

  useEffect(() => {
    databaseSharingService.getStatus().then(setDbStatus).catch(() => {})
  }, [])

  const totalRecords = dbStatus?.recordCounts
    ? Object.values(dbStatus.recordCounts).reduce((sum, n) => sum + n, 0)
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 dark:bg-amber-400/15 mb-2">
          <svg className="w-7 h-7 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary">D.A.T.A.</h1>
        <p className="text-sm text-secondary max-w-lg mx-auto">
          Data Acquisition, Transformation & Access — sync employee, candidate, and open position records from upstream HR systems for use across Nexus applications.
        </p>
      </div>

      {dbStatus && (
        <div className="flex items-center justify-center gap-6">
          <div className="glass-panel-subtle px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-muted">Total Records</span>
            <span className="text-sm font-mono font-semibold text-primary">{totalRecords.toLocaleString()}</span>
          </div>
          {dbStatus.lastImportedAt && (
            <div className="glass-panel-subtle px-4 py-3 flex items-center gap-3">
              <span className="text-xs text-muted">Last Import</span>
              <span className="text-sm font-mono text-primary">
                {new Date(dbStatus.lastImportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sources.map(source => {
          const count = dbStatus?.recordCounts?.[source.table] ?? 0
          return (
            <button
              key={source.id}
              onClick={() => onNavigate(source.id)}
              className="glass-card-hover p-6 text-left transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${source.iconBg} flex items-center justify-center mb-4 ${source.iconText}`}>
                {source.icon}
              </div>
              <h3 className="text-base font-semibold text-primary mb-1">{source.title}</h3>
              <p className="text-sm text-secondary leading-relaxed mb-4">{source.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-mono">{count.toLocaleString()} records</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => onNavigate('vectorization')}
          className="glass-card-hover p-5 text-left transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/15 to-cyan-600/10 dark:from-cyan-500/20 dark:to-cyan-600/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Vectorization</h3>
              <p className="text-xs text-secondary">Configure embedding model and API keys</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('database-sharing')}
          className="glass-card-hover p-5 text-left transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/15 to-pink-600/10 dark:from-pink-500/20 dark:to-pink-600/15 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Database Sharing</h3>
              <p className="text-xs text-secondary">Export and import database snapshots</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
