import { ReactNode } from 'react';

interface StepLabel<K extends string> {
  key: K;
  title: string;
  icon: ReactNode;
}

interface StepSummary {
  icon: ReactNode;
  label: string;
}

interface StepperBarProps<K extends string> {
  stepLabels: StepLabel<K>[];
  currentStepKey: K;
  completedSteps: Set<K>;
  onStepClick: (step: K) => void;
  stepSummaries: Partial<Record<K, StepSummary | null>>;
}

export default function StepperBar<K extends string>({
  stepLabels,
  currentStepKey,
  completedSteps,
  onStepClick,
  stepSummaries,
}: StepperBarProps<K>) {
  return (
    <div className="glass-card p-4 pb-5 mb-6">
      <div className="flex items-start">
        {stepLabels.map((step, index) => {
          const isActive = currentStepKey === step.key;
          const isCompleted = completedSteps.has(step.key);
          const isClickable = isCompleted;
          const summary = stepSummaries[step.key];

          return (
            <div key={step.key} className="flex items-start flex-1 last:flex-none">
              <button
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-1.5 w-16 sm:w-auto ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-accent-500 text-white ring-2 ring-accent-300 dark:ring-accent-500/40 ring-offset-1 ring-offset-white dark:ring-offset-dark-card'
                      : isCompleted
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center">{step.icon}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium text-center leading-tight hidden sm:block ${
                    isActive
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-accent-600 dark:text-accent-400'
                      : 'text-muted'
                  }`}
                >
                  {step.title}
                </span>
                {isCompleted && summary && (
                  <div className="hidden sm:flex items-center gap-1 mt-1 px-2 py-0.5 bg-white/60 dark:bg-dark-hover/40 rounded-full border border-gray-200/50 dark:border-dark-border/50 max-w-full">
                    <span className="w-3 h-3 text-accent-500 flex-shrink-0">
                      {summary.icon}
                    </span>
                    <span className="text-[10px] font-medium text-primary truncate">
                      {summary.label}
                    </span>
                  </div>
                )}
              </button>

              {index < stepLabels.length - 1 && (
                <div className="flex-1 mt-4 mx-1 sm:mx-2">
                  <div
                    className={`h-0.5 rounded-full ${
                      completedSteps.has(step.key)
                        ? 'bg-accent-400 dark:bg-accent-500/50'
                        : 'bg-gray-200 dark:bg-dark-border'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
