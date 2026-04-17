import { useState, useEffect } from 'react'
import { nomicoreCalcService } from '../services/nomicoreService'

const CONTRACT_TYPES = [
  { value: 'CreateDirectoMetacoralJalisco', label: 'Directo Metacoral Jalisco' },
  { value: 'CreateDirectoMetacoralCDMX', label: 'Directo Metacoral CDMX' },
  { value: 'CreateDirectoMetacoralNuevoLeon', label: 'Directo Metacoral Nuevo León' },
  { value: 'CreateDirectoUnosquareJalisco', label: 'Directo Unosquare Jalisco' },
  { value: 'CreateDirectoUnosquareCDMX', label: 'Directo Unosquare CDMX' },
  { value: 'CreateDirectoUnosquareNuevoLeon', label: 'Directo Unosquare Nuevo León' },
]

const COUNTRIES = [
  { value: 'Mexico', label: 'Mexico' },
]

export default function NomicorePage() {
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const [country, setCountry] = useState('Mexico')
  const [contractType, setContractType] = useState('CreateDirectoMetacoralJalisco')
  const [grossMonthly, setGrossMonthly] = useState<number>(0)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    nomicoreCalcService.checkSession()
      .then(r => setSessionValid(r.valid))
      .catch(() => setSessionValid(false))
  }, [])

  const handleLogin = async () => {
    setLoggingIn(true)
    setError(null)
    try {
      const r = await nomicoreCalcService.login()
      setSessionValid(r.loggedIn)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleCalculate = async () => {
    if (!grossMonthly || grossMonthly <= 0) {
      setError('Enter a valid gross monthly salary')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await nomicoreCalcService.calculate({ country, contractType, grossMonthly })
      setResult(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-2">
      <div>
        <h1 className="text-2xl font-bold text-primary">Salary Calculator</h1>
        <p className="text-sm text-muted mt-1">Calculate salary breakdowns using Nomicore</p>
      </div>

      <SessionBanner
        valid={sessionValid}
        loggingIn={loggingIn}
        onLogin={handleLogin}
      />

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Country</label>
            <select className="glass-select w-full" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Contract Type</label>
            <select className="glass-select w-full" value={contractType} onChange={e => setContractType(e.target.value)}>
              {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Gross Monthly (MXN)</label>
            <input
              type="number"
              className="glass-input w-full"
              placeholder="e.g. 50000"
              value={grossMonthly || ''}
              onChange={e => setGrossMonthly(Number(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && handleCalculate()}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            className="glass-button px-6 py-2 text-sm font-medium bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 disabled:opacity-50"
            onClick={handleCalculate}
            disabled={loading || !sessionValid || !grossMonthly}
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResultCard title="Payroll Summary" data={result.payroll} icon="📊" />
          <ResultCard title="Cost Summary" data={result.cost} icon="💼" />
          <ResultCard title="Profitability" data={result.profitability} icon="📈" />
          <ResultCard title="Rate Card" data={result.rateCard} icon="🏷️" />
        </div>
      )}

      {result && (
        <div className="text-xs text-muted text-right">
          Calculated at {new Date(result.calculatedAt).toLocaleString()}
        </div>
      )}

      {result?.screenshotBase64 && (
        <details className="glass-card p-4">
          <summary className="text-sm font-medium text-secondary cursor-pointer">Debug Screenshot</summary>
          <img
            src={`data:image/png;base64,${result.screenshotBase64}`}
            alt="Nomicore page screenshot"
            className="mt-3 rounded-lg border border-gray-200/30 dark:border-dark-border/30 max-w-full"
          />
        </details>
      )}

      {result?.diagnostics && (
        <details className="glass-card p-4">
          <summary className="text-sm font-medium text-secondary cursor-pointer">
            Diagnostics ({result.diagnostics.phases?.length || 0} phases, {result.diagnostics.pageStructure?.tableCount || 0} tables found)
          </summary>
          <div className="mt-3 space-y-4 text-xs font-mono">
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Phases</h4>
              <div className="space-y-1">
                {result.diagnostics.phases?.map((p: any, i: number) => (
                  <div key={i} className="flex gap-2">
                    <span className={p.status === 'ok' || p.status === 'populated' ? 'text-green-400' : p.status === 'timeout' || p.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>
                      {p.status === 'ok' || p.status === 'populated' ? '✓' : p.status === 'timeout' || p.status === 'failed' ? '✗' : '⚠'}
                    </span>
                    <span className="text-secondary">{p.phase}</span>
                    <span className="text-muted">{p.status}</span>
                    {p.detail && <span className="text-muted truncate max-w-md">{p.detail}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Page Headings ({result.diagnostics.pageStructure?.headings?.length || 0})</h4>
              <div className="text-muted whitespace-pre-wrap">
                {result.diagnostics.pageStructure?.headings?.join('\n') || 'None found'}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Tables ({result.diagnostics.pageStructure?.tableCount || 0})</h4>
              {result.diagnostics.pageStructure?.tables?.map((t: any) => (
                <div key={t.index} className="glass-panel-subtle p-2 mb-2">
                  <div className="text-secondary">Table #{t.index}: {t.headerText}</div>
                  <div className="text-muted">rows={t.rows} td-cells={t.cells} th-cells={t.thCount} classes="{t.tableClasses}"</div>
                  {t.sampleHeaders?.length > 0 && <div className="text-muted">Headers: {t.sampleHeaders.join(' | ')}</div>}
                  {t.sampleCells?.length > 0 && <div className="text-muted">Sample row: {t.sampleCells.join(' | ')}</div>}
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Inputs ({result.diagnostics.pageStructure?.inputCount || 0})</h4>
              <div className="text-muted whitespace-pre-wrap">
                {result.diagnostics.pageStructure?.inputs?.map((inp: any, i: number) =>
                  `[${i}] type=${inp.type} name="${inp.name}" id="${inp.id}" value="${inp.value}"`
                ).join('\n') || 'None found'}
              </div>
            </div>

            {result.diagnostics.allTablesData && Object.keys(result.diagnostics.allTablesData).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">All Extracted Table Data</h4>
                {Object.entries(result.diagnostics.allTablesData).map(([name, data]: [string, any]) => (
                  <details key={name} className="glass-panel-subtle p-2 mb-2">
                    <summary className="text-secondary cursor-pointer">{name} ({Object.keys(data).length} rows)</summary>
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(data).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-muted truncate">{k}</span>
                          <span className="text-primary whitespace-nowrap">{v}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Body Text (first 500 chars)</h4>
              <div className="text-muted whitespace-pre-wrap break-all">{result.diagnostics.pageStructure?.bodyTextSnippet || 'Empty'}</div>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

function SessionBanner({ valid, loggingIn, onLogin }: {
  valid: boolean | null
  loggingIn: boolean
  onLogin: () => void
}) {
  if (valid === null) {
    return (
      <div className="glass-card-subtle p-3 text-sm text-muted flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Checking Nomicore session...
      </div>
    )
  }

  if (valid) {
    return (
      <div className="glass-card-subtle p-3 flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-secondary">Nomicore session active</span>
      </div>
    )
  }

  return (
    <div className="glass-card-subtle p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-secondary">Nomicore login required — a browser will open for Azure AD sign-in</span>
      </div>
      <button
        className="glass-button px-4 py-1.5 text-xs font-medium"
        onClick={onLogin}
        disabled={loggingIn}
      >
        {loggingIn ? 'Waiting for login...' : 'Login to Nomicore'}
      </button>
    </div>
  )
}

function ResultCard({ title, data, icon }: {
  title: string
  data: Record<string, string>
  icon: string
}) {
  const entries = Object.entries(data)

  if (entries.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        <p className="text-xs text-muted italic">No data found — selectors may need adjustment</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-1.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex justify-between items-center text-sm py-0.5">
            <span className="text-muted truncate mr-4">{key}</span>
            <span className="text-primary font-mono text-right whitespace-nowrap">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
