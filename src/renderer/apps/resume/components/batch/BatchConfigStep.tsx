import { useState } from 'react';
import { BatchFlowType, BatchConfig, RefinementMode } from '../../types';

interface BatchConfigStepProps {
  flow: BatchFlowType;
  onNext: (config: BatchConfig) => void;
}

interface RefinementOption {
  id: RefinementMode;
  name: string;
  description: string;
  icon: JSX.Element;
}

const REFINEMENT_MODES: RefinementOption[] = [
  {
    id: 'professional-polish',
    name: 'Professional Polish',
    description: 'Clean up formatting, improve grammar, and ensure consistent professional language.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    id: 'impact-focused',
    name: 'Impact-Focused',
    description: 'Rewrite achievements to emphasize measurable impact and quantified results.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'ats-optimized',
    name: 'ATS-Optimized',
    description: 'Optimize keyword density and formatting for applicant tracking systems.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'job-tailoring',
    name: 'Job Tailoring',
    description: 'Tailor each resume to a specific job description for maximum relevance.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
];

const EXTRACTION_FIELDS = [
  'Full Name',
  'Email',
  'Phone',
  'Location',
  'Summary',
  'Skills',
  'Experience',
  'Education',
  'Certifications',
  'LinkedIn URL',
];

export default function BatchConfigStep({ flow, onNext }: BatchConfigStepProps) {
  const [refinementMode, setRefinementMode] = useState<RefinementMode>('professional-polish');
  const [extractionFormat, setExtractionFormat] = useState<'json' | 'csv'>('json');
  const [fieldsToExtract, setFieldsToExtract] = useState<string[]>(EXTRACTION_FIELDS);

  const handleToggleField = (field: string) => {
    setFieldsToExtract((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleContinue = () => {
    if (flow === 'resume-processing') {
      onNext({ flow, refinementMode });
    } else {
      onNext({ flow, extractionFormat, fieldsToExtract });
    }
  };

  return (
    <div className="space-y-4">
      {flow === 'resume-processing' && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-primary">Enhancement Mode</h2>
          </div>

          <p className="text-sm text-muted mb-4">
            Select a refinement mode that will be applied to all resumes in the batch.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REFINEMENT_MODES.map((mode) => {
              const isSelected = refinementMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setRefinementMode(mode.id)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-accent-500/50 bg-accent-500/10 dark:bg-accent-500/10'
                      : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-accent-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-accent-500/20 text-accent-600 dark:text-accent-400' : 'bg-gray-100 dark:bg-dark-hover text-gray-400'
                    }`}>
                      {mode.icon}
                    </div>
                    <span className="font-semibold text-sm text-primary">{mode.name}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{mode.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {flow === 'data-extraction' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-primary">Output Format</h2>
            </div>

            <div className="flex gap-3">
              {(['json', 'csv'] as const).map((fmt) => {
                const isSelected = extractionFormat === fmt;
                return (
                  <button
                    key={fmt}
                    onClick={() => setExtractionFormat(fmt)}
                    className={`flex-1 p-4 rounded-xl border text-center transition-all duration-200 ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/10'
                        : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-emerald-500/20'
                    }`}
                  >
                    <div className="font-semibold text-sm text-primary mb-0.5 uppercase">{fmt}</div>
                    <div className="text-xs text-muted">
                      {fmt === 'json' ? 'Structured JSON objects' : 'Comma-separated values'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-primary">Fields to Extract</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {EXTRACTION_FIELDS.map((field) => {
                const isSelected = fieldsToExtract.includes(field);
                return (
                  <button
                    key={field}
                    onClick={() => handleToggleField(field)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-gray-200/30 dark:border-dark-border/30 text-muted hover:border-emerald-500/20'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {field}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-muted">
              {fieldsToExtract.length} of {EXTRACTION_FIELDS.length} fields selected
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={flow === 'data-extraction' && fieldsToExtract.length === 0}
        className="w-full py-3 px-6 bg-gradient-to-r from-accent-500 to-indigo-500 hover:from-accent-600 hover:to-indigo-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Start Processing
      </button>
    </div>
  );
}
