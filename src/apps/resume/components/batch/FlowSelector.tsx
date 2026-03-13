import { BatchFlowType } from '../../types';

interface FlowSelectorProps {
  onSelect: (flow: BatchFlowType) => void;
  selectedFlow?: BatchFlowType | null;
}

interface FlowOption {
  id: BatchFlowType;
  title: string;
  description: string;
  tags: string[];
  icon: JSX.Element;
  gradient: string;
  tagColor: string;
}

const FLOWS: FlowOption[] = [
  {
    id: 'resume-processing',
    title: 'Resume Processing',
    description:
      'Transform and enhance multiple resumes using AI. Apply refinement modes, validate, and export in USQ format.',
    tags: ['Enhancement', 'Validation', 'USQ Format'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
    ),
    gradient: 'from-accent-500 to-indigo-500',
    tagColor: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
  },
  {
    id: 'data-extraction',
    title: 'Data Extraction',
    description:
      'Extract structured data from resumes into a standardized format. Names, skills, experience, education — ready for your database.',
    tags: ['Structured Data', 'JSON Output', 'Skills Extraction'],
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
        />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-500',
    tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
];

export default function FlowSelector({ onSelect, selectedFlow }: FlowSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Select a Processing Flow</h2>
        <p className="text-sm text-muted mt-1">Choose what you'd like to do with your batch of resumes</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {FLOWS.map((flow) => {
          const isSelected = selectedFlow === flow.id;
          return (
            <button
              key={flow.id}
              onClick={() => onSelect(flow.id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 group ${
                isSelected
                  ? 'border-accent-500/50 bg-accent-500/5 dark:bg-accent-500/5'
                  : 'border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-accent-500/20'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${flow.gradient} flex items-center justify-center text-white flex-shrink-0`}
                >
                  {flow.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-primary">{flow.title}</h3>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{flow.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {flow.tags.map((tag) => (
                      <span key={tag} className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${flow.tagColor}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-2">
        {['Talent Scoring', 'Resume Comparison'].map((name) => (
          <div
            key={name}
            className="p-6 rounded-2xl border-2 border-dashed border-gray-200/30 dark:border-dark-border/30 opacity-50"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-200/50 dark:bg-dark-hover flex items-center justify-center text-gray-400 flex-shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-400 dark:text-gray-500">{name}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-gray-500 rounded-full uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">This flow will be available in a future update.</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
