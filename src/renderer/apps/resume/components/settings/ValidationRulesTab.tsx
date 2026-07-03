import { memo } from 'react'
import { validationService } from '../../services/validationService'

const ValidationRulesTab = memo(function ValidationRulesTab() {
  const categories = validationService.getRuleCatalogStatic()
  const totalRules = categories.reduce((sum, c) => sum + c.rules.length, 0)
  const criticalCount = categories.reduce((sum, c) => sum + c.rules.filter(r => r.severity === 'error').length, 0)
  const enhancementCount = totalRules - criticalCount

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-sm font-semibold text-primary">Resume Validation Rules</h3>
        </div>
        <p className="text-xs text-muted mb-4">
          These rules are automatically applied to every resume during transformation and review.
          All rules run regardless of outcome — flags are informational.
        </p>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-dark-hover/30">
            <span className="text-lg font-bold text-primary">{totalRules}</span>
            <span className="text-xs text-muted">Total Rules</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/60 dark:bg-blue-500/10">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{criticalCount}</span>
            <span className="text-xs text-blue-600 dark:text-blue-400">Critical</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50/60 dark:bg-teal-500/10">
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{enhancementCount}</span>
            <span className="text-xs text-teal-600 dark:text-teal-400">Enhancement</span>
          </div>
        </div>
      </div>

      {categories.map(({ category, rules }) => (
        <div key={category} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-white/50 dark:bg-dark-hover/30 border-b border-gray-200/30 dark:border-dark-border/30">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">{category}</h4>
              <span className="text-xs text-muted">{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
            {rules.map((rule) => (
              <div key={rule.rule} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm text-primary">{rule.description}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  rule.severity === 'error'
                    ? 'bg-blue-100/80 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-teal-100/80 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400'
                }`}>
                  {rule.severity === 'error' ? 'critical' : 'enhancement'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="glass-panel-subtle rounded-xl p-4 border-l-4 border-blue-400/60">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-muted leading-relaxed">
            All validation rules run on every resume during the Review step.
            Flags are informational — they highlight areas to review but do not block the process.
            <strong className="text-primary"> Critical</strong> rules cover essential resume completeness.
            <strong className="text-primary"> Enhancement</strong> rules offer tips for improving impact.
          </p>
        </div>
      </div>
    </div>
  )
})

export default ValidationRulesTab
