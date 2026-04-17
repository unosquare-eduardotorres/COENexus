import { useState, useCallback } from 'react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'

const log = createRendererLogger('DataMaintenanceTab')

interface BackfillResult {
  candidatesUpdated: number
  employeesUpdated: number
  errors: number
}

export default function DataMaintenanceTab() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBackfillSalaries = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      log.info('Starting salary normalization backfill')
      const backfillResult = await window.api.sync.backfillSalaryNormalization()
      setResult(backfillResult)
      log.info('Salary normalization backfill complete', backfillResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      log.error('Salary normalization backfill failed', { error: message })
    } finally {
      setIsRunning(false)
    }
  }, [])

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-primary mb-1">Salary Normalization</h3>
        <p className="text-xs text-muted mb-5">
          Normalize salary expectations across all synced candidates and employees to USD/month.
          This enables accurate salary comparisons across countries and currencies for Scout9 and Braniac.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100/80 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-primary">Backfill Normalized Salaries</h4>
                <p className="text-xs text-muted">
                  Process all records missing normalized_monthly_usd values
                </p>
              </div>
            </div>
            <button
              onClick={handleBackfillSalaries}
              disabled={isRunning}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                isRunning
                  ? 'bg-gray-200 dark:bg-dark-hover text-muted cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running...
                </span>
              ) : 'Normalize Salaries'}
            </button>
          </div>

          {result && (
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Backfill Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{result.candidatesUpdated}</p>
                  <p className="text-xs text-muted">Candidates</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{result.employeesUpdated}</p>
                  <p className="text-xs text-muted">Employees</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${result.errors > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{result.errors}</p>
                  <p className="text-xs text-muted">Errors</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50/80 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-red-700 dark:text-red-400">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-primary mb-1">How It Works</h3>
        <div className="space-y-2 text-xs text-muted">
          <p>The salary normalization process:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Reads each candidate/employee&apos;s <code className="px-1 py-0.5 bg-white/50 dark:bg-dark-hover/50 rounded text-primary">salary_expectations</code> field</li>
            <li>Infers the currency based on the person&apos;s country (e.g., MX → MXN, CO → COP)</li>
            <li>Converts to USD/month using stored exchange rates</li>
            <li>Stores the result as <code className="px-1 py-0.5 bg-white/50 dark:bg-dark-hover/50 rounded text-primary">normalized_monthly_usd</code> with a confidence level</li>
          </ol>
          <p className="mt-2">
            Confidence levels: <strong>exact</strong> (USD input), <strong>high</strong> (reliable country-based inference),
            <strong> medium</strong> (some ambiguity), <strong>low</strong> (best guess).
          </p>
        </div>
      </div>
    </div>
  )
}
