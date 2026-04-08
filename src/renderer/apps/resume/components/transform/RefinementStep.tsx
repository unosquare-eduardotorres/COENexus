import { ReactNode } from 'react';
import { RefinementMode } from '../../types';
import { useTransformContext } from '../../contexts/TransformContext';

const cards: {
  mode: RefinementMode;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    mode: 'professional-polish',
    title: 'Professional Polish',
    description: 'Refine, restructure, and enhance the resume using professional standards and best practices.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
  },
  {
    mode: 'impact-focused',
    title: 'Impact-Focused',
    description: 'Rewrite to emphasize measurable achievements, results, and quantifiable impact.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  },
  {
    mode: 'ats-optimized',
    title: 'ATS-Optimized',
    description: 'Optimize for Applicant Tracking Systems with keyword alignment and clean formatting.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  },
  {
    mode: 'job-tailoring',
    title: 'Job Description Tailoring',
    description: 'Reshape the resume to highlight the most relevant experience for a specific role.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
  },
];

export default function RefinementStep() {
  const {
    refinement: { refinementMode, setRefinementMode },
    intent: { sourceType },
    selection: { selectedCandidate, selectedEmployee, selectedFiles },
    wizard: { handleBack, handleNextFromStep3 },
  } = useTransformContext();
  const selectedFilesCount = selectedFiles.length;

  return (
    <div className="glass-card p-6 mb-6">
      <h2 className="text-base font-semibold text-primary mb-1">Enhancement Mode</h2>
      <p className="text-sm text-muted mb-5">Choose how you want to enhance this resume.</p>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <button
            key={card.mode}
            onClick={() => setRefinementMode(card.mode)}
            className={`relative glass-card-hover p-5 text-left transition-all rounded-xl ${
              refinementMode === card.mode
                ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                : 'border border-transparent'
            }`}
          >
            {refinementMode === card.mode && (
              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {card.icon}
              </svg>
            </div>
            <h3 className="text-sm font-bold text-primary mb-1">{card.title}</h3>
            <p className="text-xs text-muted leading-relaxed">{card.description}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>
        <button
          onClick={handleNextFromStep3}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
        >
          {refinementMode === 'job-tailoring' ? (
            <>
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Enhance{' '}
              {sourceType === 'ats-candidates' && selectedCandidate
                ? `${selectedCandidate.name}'s Resume`
                : sourceType === 'employees' && selectedEmployee
                  ? `${selectedEmployee.name}'s Resume`
                  : `${selectedFilesCount} Resume${selectedFilesCount !== 1 ? 's' : ''}`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
