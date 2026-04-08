import { memo } from 'react';
import { ValidationResult, ValidationStatus } from '../types';

type ValidationFilterType = 'warning' | 'improvement' | 'valid' | null;

interface ValidationPanelProps {
  results: ValidationResult[];
  completeness: {
    percentage: number;
    filledFields: number;
    totalFields: number;
    missingFields: string[];
  };
  onFieldClick?: (field: string) => void;
  activeFilter: ValidationFilterType;
  onFilterChange: (filter: ValidationFilterType) => void;
}

const ValidationPanel = memo(function ValidationPanel({
  results,
  completeness,
  onFieldClick,
  activeFilter,
  onFilterChange,
}: ValidationPanelProps) {
  const allWarnings = results.filter(
    (r) => r.status !== 'valid' && r.category === 'warning'
  );
  const improvements = results.filter(
    (r) => r.status !== 'valid' && r.category === 'improvement'
  );
  const valid = results.filter((r) => r.status === 'valid');

  const filteredWarnings = activeFilter === null || activeFilter === 'warning' ? allWarnings : [];
  const filteredImprovements = activeFilter === null || activeFilter === 'improvement' ? improvements : [];
  const filteredValid = activeFilter === null || activeFilter === 'valid' ? valid : [];

  const getStatusIcon = (status: ValidationStatus, category?: 'warning' | 'improvement') => {
    switch (status) {
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        if (category === 'improvement') {
          return (
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          );
        }
        return (
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'valid':
        return (
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getCompletenessColor = () => {
    if (completeness.percentage >= 90) return 'bg-emerald-500';
    if (completeness.percentage >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/\[(\d+)\]/g, ' #$1')
      .replace(/\./g, ' › ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-gray-200/30 dark:border-dark-border/30">
        <h3 className="text-base font-semibold text-primary mb-4">Validation & Completeness</h3>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-muted">Completeness</span>
            <span className="text-sm font-semibold text-primary">{completeness.percentage}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100/50 dark:bg-dark-hover/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${getCompletenessColor()} transition-all duration-500`}
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            {completeness.filledFields} of {completeness.totalFields} required fields filled
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onFilterChange(activeFilter === 'warning' ? null : 'warning')}
            className={`text-center p-3 rounded-xl transition-all cursor-pointer ${
              activeFilter === 'warning'
                ? 'ring-2 ring-amber-500 bg-amber-100/70 dark:bg-amber-500/20'
                : 'bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100/50 dark:hover:bg-amber-500/15'
            }`}
          >
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{allWarnings.length}</span>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">Warnings</p>
          </button>
          <button
            onClick={() => onFilterChange(activeFilter === 'improvement' ? null : 'improvement')}
            className={`text-center p-3 rounded-xl transition-all cursor-pointer ${
              activeFilter === 'improvement'
                ? 'ring-2 ring-teal-500 bg-teal-100/70 dark:bg-teal-500/20'
                : 'bg-teal-50/50 dark:bg-teal-500/10 hover:bg-teal-100/50 dark:hover:bg-teal-500/15'
            }`}
          >
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">{improvements.length}</span>
            <p className="text-xs font-medium text-teal-600 dark:text-teal-400 mt-1">Improvements</p>
          </button>
          <button
            onClick={() => onFilterChange(activeFilter === 'valid' ? null : 'valid')}
            className={`text-center p-3 rounded-xl transition-all cursor-pointer ${
              activeFilter === 'valid'
                ? 'ring-2 ring-emerald-500 bg-emerald-100/70 dark:bg-emerald-500/20'
                : 'bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/15'
            }`}
          >
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{valid.length}</span>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">Valid</p>
          </button>
        </div>
      </div>

      {completeness.missingFields.length > 0 && (
        <div className="p-3 border-b border-gray-200/30 dark:border-dark-border/30 bg-red-50/30 dark:bg-red-500/5">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Missing Required Fields
          </h4>
          <ul className="space-y-0.5">
            {completeness.missingFields.map((field, index) => (
              <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto">
        {filteredWarnings.length > 0 && (
          <div className="p-3 border-b border-gray-200/30 dark:border-dark-border/30">
            <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Warnings
            </h4>
            <div className="space-y-1.5">
              {filteredWarnings.map((result, index) => (
                <div
                  key={`warning-${index}`}
                  onClick={() => onFieldClick?.(result.field)}
                  className="flex items-start gap-2 p-2 bg-amber-50/50 dark:bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-500/15 transition-colors"
                >
                  {getStatusIcon(result.status, 'warning')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      {formatFieldName(result.field)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredImprovements.length > 0 && (
          <div className="p-3 border-b border-gray-200/30 dark:border-dark-border/30">
            <h4 className="text-sm font-medium text-teal-600 dark:text-teal-400 mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              Improvements
            </h4>
            <div className="space-y-1.5">
              {filteredImprovements.map((result, index) => (
                <div
                  key={`improvement-${index}`}
                  onClick={() => onFieldClick?.(result.field)}
                  className="flex items-start gap-2 p-2 bg-teal-50/50 dark:bg-teal-500/10 rounded-lg cursor-pointer hover:bg-teal-100/50 dark:hover:bg-teal-500/15 transition-colors"
                >
                  {getStatusIcon(result.status, 'improvement')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      {formatFieldName(result.field)}
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredValid.length > 0 && (
          <div className="p-3">
            <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">Valid Sections</h4>
            <div className="space-y-1.5">
              {filteredValid.map((result, index) => (
                <div
                  key={`valid-${index}`}
                  className="flex items-center gap-2 p-2 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-lg"
                >
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {formatFieldName(result.field)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="p-6 text-center">
            <svg
              className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <p className="text-xs text-muted">
              Click "Validate" to check the resume against company guidelines
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ValidationPanel;
