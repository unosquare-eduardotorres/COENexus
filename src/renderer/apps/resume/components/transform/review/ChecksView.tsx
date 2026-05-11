import { useState } from 'react'
import { validationService } from '../../../services/validationService'
import { StructuredResume, ValidationResult } from '../../../types'

type FilterType = 'all' | 'warnings' | 'improvements' | 'passed'

interface ChecksViewProps {
  resume: StructuredResume
  completeness: {
    percentage: number
    filledFields: number
    totalFields: number
    missingFields: string[]
  }
  validationResults: ValidationResult[]
}

export default function ChecksView({ resume, completeness, validationResults }: ChecksViewProps) {
  const { hardRules, tips } = validationService.getRuleCatalog(resume)
  const sections = [...new Set(hardRules.map(r => r.section))]
  const applicableRules = hardRules.filter(r => r.status !== 'not-applicable')
  const passedCount = applicableRules.filter(r => r.status === 'pass').length
  const failedCount = applicableRules.filter(r => r.status === 'fail').length
  const warningCount = applicableRules.filter(r => r.status !== 'pass' && r.severity === 'warning').length
  const totalCount = applicableRules.length

  const valWarnings = validationResults.filter(r => r.status !== 'valid' && r.category === 'warning')
  const valImprovements = validationResults.filter(r => r.status !== 'valid' && r.category === 'improvement')
  const valPassed = validationResults.filter(r => r.status === 'valid')

  const [filter, setFilter] = useState<FilterType>('all')

  const getCompletenessColor = () => {
    if (completeness.percentage >= 90) return 'bg-emerald-500'
    if (completeness.percentage >= 70) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getCompletenessTextColor = () => {
    if (completeness.percentage >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (completeness.percentage >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const formatFieldName = (field: string) => {
    return field
      .replace(/\[(\d+)\]/g, ' #$1')
      .replace(/\./g, ' › ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (str) => str.toUpperCase())
  }

  const shouldShowRule = (rule: { status: string; severity?: string }) => {
    if (filter === 'all') return true
    if (filter === 'passed') return rule.status === 'pass'
    if (filter === 'warnings') return rule.status !== 'pass' && (rule.severity === 'warning' || rule.severity === 'error')
    return false
  }

  return (
    <div className="w-full space-y-4">
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-gray-200/30 dark:border-dark-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                completeness.percentage >= 90 ? 'bg-emerald-100/80 dark:bg-emerald-500/20' : completeness.percentage >= 70 ? 'bg-amber-100/80 dark:bg-amber-500/20' : 'bg-red-100/80 dark:bg-red-500/20'
              }`}>
                <svg className={`w-4 h-4 ${getCompletenessTextColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Resume Completeness</h3>
                <p className="text-xs text-muted">{completeness.filledFields} of {completeness.totalFields} required fields filled</p>
              </div>
            </div>
            <span className={`text-2xl font-bold ${getCompletenessTextColor()}`}>{completeness.percentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100/50 dark:bg-dark-hover/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${getCompletenessColor()} transition-all duration-500 rounded-full`}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
        </div>

        {completeness.missingFields.length > 0 && (
          <div className="p-3 border-b border-gray-200/30 dark:border-dark-border/30 bg-red-50/30 dark:bg-red-500/5">
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Missing Fields
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {completeness.missingFields.map((field, index) => (
                <span key={index} className="px-2 py-0.5 text-xs font-medium bg-red-100/60 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full">
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-0 border-b border-gray-200/30 dark:border-dark-border/30">
          {([
            { key: 'all' as FilterType, label: 'All', count: totalCount, color: 'text-accent-600 dark:text-accent-400', bg: 'bg-accent-50/60 dark:bg-accent-500/10', ring: 'ring-accent-500' },
            { key: 'warnings' as FilterType, label: 'Warnings', count: valWarnings.length + warningCount + failedCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/60 dark:bg-amber-500/10', ring: 'ring-amber-500' },
            { key: 'improvements' as FilterType, label: 'Tips', count: valImprovements.length + tips.length, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/60 dark:bg-indigo-500/10', ring: 'ring-indigo-500' },
            { key: 'passed' as FilterType, label: 'Passed', count: valPassed.length + passedCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-500/10', ring: 'ring-emerald-500' },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-center py-2.5 px-2 transition-all ${
                filter === f.key ? `${f.bg} ring-2 ${f.ring} ring-inset` : 'hover:bg-white/30 dark:hover:bg-dark-hover/20'
              }`}
            >
              <span className={`text-lg font-bold ${f.color}`}>{f.count}</span>
              <p className={`text-[10px] font-semibold ${f.color} uppercase tracking-wider`}>{f.label}</p>
            </button>
          ))}
        </div>
      </div>

      {(filter === 'all' || filter === 'warnings' || filter === 'passed') && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 border-b border-gray-200/30 dark:border-dark-border/30">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-sm font-semibold text-primary">Validation Rules</h3>
            </div>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              passedCount === totalCount
                ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}>
              {passedCount}/{totalCount} passed
            </span>
          </div>
          <div>
            {sections.map((section) => {
              const sectionRules = hardRules.filter(r => r.section === section && shouldShowRule(r))
              if (sectionRules.length === 0) return null
              return (
                <div key={section}>
                  <div className="px-4 py-2 bg-gray-50/60 dark:bg-dark-surface/40 border-b border-gray-200/30 dark:border-dark-border/30">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">{section}</span>
                  </div>
                  <div className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
                    {sectionRules.map((rule) => (
                      <div key={rule.rule} className="px-4 py-2.5 hover:bg-white/30 dark:hover:bg-dark-hover/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
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
                            <span className="text-sm text-primary">{rule.description}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${
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
                          <p className="text-xs text-muted mt-1 ml-6.5">{rule.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(filter === 'all' || filter === 'warnings') && valWarnings.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-amber-50/40 dark:bg-amber-500/10 border-b border-amber-200/30 dark:border-amber-500/20">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Validation Warnings</h3>
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">{valWarnings.length}</span>
          </div>
          <div className="divide-y divide-amber-200/20 dark:divide-amber-500/10">
            {valWarnings.map((result, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition-colors">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{formatFieldName(result.field)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(filter === 'all' || filter === 'improvements') && (tips.length > 0 || valImprovements.length > 0) && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-indigo-50/40 dark:bg-indigo-500/10 border-b border-indigo-200/30 dark:border-indigo-500/20">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Tips & Improvements</h3>
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
              {valImprovements.length + tips.length}
            </span>
          </div>
          <div className="divide-y divide-indigo-200/20 dark:divide-indigo-500/10">
            {valImprovements.map((result, i) => (
              <div key={`vi-${i}`} className="flex items-start gap-2.5 p-3 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{formatFieldName(result.field)}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{result.message}</p>
                </div>
              </div>
            ))}
            {tips.map((tip, i) => (
              <div key={`tip-${i}`} className="flex items-start gap-2.5 p-3 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">{tip.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(filter === 'all' || filter === 'passed') && valPassed.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-emerald-50/40 dark:bg-emerald-500/10 border-b border-emerald-200/30 dark:border-emerald-500/20">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Passed Checks</h3>
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">{valPassed.length}</span>
          </div>
          <div className="divide-y divide-emerald-200/20 dark:divide-emerald-500/10">
            {valPassed.map((result, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{formatFieldName(result.field)}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
