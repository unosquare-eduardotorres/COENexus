import { memo } from 'react';
import { VectorizationConfig, VoyageModel } from '../../types';

interface VectorizationTabProps {
  vecConfig: VectorizationConfig;
  setVecConfig: React.Dispatch<React.SetStateAction<VectorizationConfig>>;
  handleSaveVecModel: () => void;
  voyageKeyConfigured: boolean;
  voyageKeyMasked: string;
  voyageKeySource: string;
}

const VectorizationTab = memo(function VectorizationTab({
  vecConfig, setVecConfig, handleSaveVecModel,
  voyageKeyConfigured, voyageKeyMasked, voyageKeySource,
}: VectorizationTabProps) {
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-primary mb-1">Voyage AI API Key</h3>
        <p className="text-xs text-muted mb-4">
          Required for generating resume embeddings. Configured via environment variable.
        </p>

        {voyageKeyConfigured ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-500/10 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Configured: <span className="font-mono">{voyageKeyMasked}</span>
              </span>
              {voyageKeySource && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-200/60 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  via {voyageKeySource}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-50/60 dark:bg-amber-500/10 rounded-lg border border-amber-200/50 dark:border-amber-500/20">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Not configured</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                Set the <code className="font-mono bg-amber-100 dark:bg-amber-500/10 px-1 rounded">Voyage__ApiKey</code> environment variable
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Managed securely via environment variables. Never stored in the database.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-1">Embedding Model</h3>
            <p className="text-xs text-muted">Select the Voyage AI model for generating resume embeddings.</p>
          </div>
          <button
            onClick={handleSaveVecModel}
            className="px-4 py-1.5 bg-violet-500 text-white text-xs font-medium rounded-lg hover:bg-violet-600 transition-colors"
          >
            Save Model
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: 'voyage-4-large' as const,
              name: 'Voyage 4 Large',
              badge: 'Best Quality',
              description: 'Highest retrieval accuracy. 1536-dim embeddings ideal for all resumes.',
              strengths: ['Best accuracy', '1536-dim', 'Free 200M tokens'],
              isRecommended: true,
              selectedBorder: 'border-violet-500 bg-violet-50/40 dark:bg-violet-500/10',
              badgeStyle: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
              iconSelectedColor: 'text-violet-500',
              checkColor: 'text-violet-500',
            },
            {
              id: 'voyage-4' as const,
              name: 'Voyage 4',
              badge: 'Balanced',
              description: 'Good balance of quality and speed. Compatible embeddings.',
              strengths: ['Balanced', 'Compatible vectors', 'General purpose'],
              isRecommended: false,
              selectedBorder: 'border-accent-500 bg-accent-50/40 dark:bg-accent-500/10',
              badgeStyle: 'bg-accent-100 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400',
              iconSelectedColor: 'text-accent-500',
              checkColor: 'text-accent-500',
            },
            {
              id: 'voyage-4-lite' as const,
              name: 'Voyage 4 Lite',
              badge: 'Fastest',
              description: 'Ultra-fast. Great for JD embedding at search time. Vector-compatible.',
              strengths: ['Ultra-fast', 'Low latency', 'JD embedding'],
              isRecommended: false,
              selectedBorder: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10',
              badgeStyle: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
              iconSelectedColor: 'text-emerald-500',
              checkColor: 'text-emerald-500',
            },
          ].map((model) => {
            const isSelected = vecConfig.model === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setVecConfig((prev) => ({ ...prev, model: model.id }))}
                className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? model.selectedBorder
                    : 'border-transparent bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {model.isRecommended ? (
                    <svg className={`w-4 h-4 ${isSelected ? 'text-violet-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : (
                    <svg className={`w-4 h-4 ${isSelected ? model.iconSelectedColor : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span className="text-sm font-semibold text-primary">{model.name}</span>
                </div>
                <span className={`inline-block px-1.5 py-0.5 text-xs font-semibold rounded-full mb-2 ${model.badgeStyle}`}>
                  {model.badge}
                </span>
                <p className="text-xs text-muted leading-relaxed mb-2.5">{model.description}</p>
                <div className="flex flex-wrap gap-1">
                  {model.strengths.map((s) => (
                    <span key={s} className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded">
                      {s}
                    </span>
                  ))}
                </div>
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5">
                    <svg className={`w-4 h-4 ${model.checkColor}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-panel-subtle rounded-xl p-4 border-l-4 border-violet-400/60">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-muted leading-relaxed">
            All Voyage 4 models produce compatible embeddings in a shared space. You can embed resumes with
            voyage-4-large for quality, then swap JD-side to voyage-4-lite for speed — without re-embedding
            any profiles.
          </p>
        </div>
      </div>
    </div>
  );

});

export default VectorizationTab;
