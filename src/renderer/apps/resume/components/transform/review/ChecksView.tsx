import { validationService } from '../../../services/validationService'
import { StructuredResume } from '../../../types'

interface ChecksViewProps {
  resume: { resume: StructuredResume }
}

export default function ChecksView({ resume }: ChecksViewProps) {
  const { hardRules, tips } = validationService.getRuleCatalog(resume)
  const sections = [...new Set(hardRules.map(r => r.section))]
  const applicableRules = hardRules.filter(r => r.status !== 'not-applicable')
  const passedCount = applicableRules.filter(r => r.status === 'pass').length
  const totalCount = applicableRules.length
  const allPassed = passedCount === totalCount

  return (
    <div className="w-full space-y-4">
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-dark-hover/30 border-b border-gray-200/30 dark:border-dark-border/30">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              allPassed ? 'bg-emerald-100/80 dark:bg-emerald-500/20' : 'bg-red-100/80 dark:bg-red-500/20'
            }`}>
              <svg className={`w-4 h-4 ${
                allPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Validation Rules</h3>
              <p className="text-xs text-muted">{passedCount} of {totalCount} passed</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
            allPassed
              ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100/80 dark:bg-red-500/20 text-red-700 dark:text-red-400'
          }`}>
            {allPassed ? 'ALL PASSED' : 'NEEDS REVIEW'}
          </span>
        </div>
        <div>
          {sections.map((section) => {
            const sectionRules = hardRules.filter(r => r.section === section)
            return (
              <div key={section}>
                <div className="px-4 py-2 bg-gray-50/60 dark:bg-dark-surface/40 border-b border-gray-200/30 dark:border-dark-border/30">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">{section}</span>
                </div>
                <div className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
                  {sectionRules.map((rule) => (
                    <div key={rule.rule} className="px-4 py-3 hover:bg-white/30 dark:hover:bg-dark-hover/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {rule.status === 'pass' ? (
                            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : rule.status === 'not-applicable' ? (
                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          ) : rule.severity === 'warning' ? (
                            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className="text-sm font-medium text-primary">{rule.description}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                          rule.status === 'pass'
                            ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : rule.status === 'not-applicable'
                              ? 'bg-gray-100/80 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300'
                              : rule.severity === 'warning'
                                ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                : 'bg-red-100/80 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                          {rule.status === 'pass' ? 'Pass' : rule.status === 'not-applicable' ? 'N/A' : rule.severity === 'warning' ? 'Warning' : 'Fail'}
                        </span>
                      </div>
                      {rule.status === 'fail' && rule.message && (
                        <p className="text-xs text-muted mt-1 ml-7">{rule.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {tips.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-indigo-50/40 dark:bg-indigo-500/10 border-b border-indigo-200/30 dark:border-indigo-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100/80 dark:bg-indigo-500/20">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-primary">Tips & Improvements</h3>
            </div>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
              {tips.length} {tips.length === 1 ? 'tip' : 'tips'}
            </span>
          </div>
          <div className="divide-y divide-indigo-200/20 dark:divide-indigo-500/10">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-primary">{tip.message}</span>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                  Tip
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
