import ReadinessRing from './ReadinessRing';

interface ScorecardPreviewProps {
  compositeScore?: number;
  knowledgeScore?: number;
  deliveryScore?: number;
  candidateName: string;
  candidateRole: string;
  earlyIndicators?: string[];
  onComplete?: () => void;
  onRequestReview?: () => void;
}

export default function ScorecardPreview({
  compositeScore = 0,
  knowledgeScore,
  deliveryScore,
  candidateName,
  candidateRole,
  earlyIndicators = [],
  onComplete,
  onRequestReview,
}: ScorecardPreviewProps) {
  return (
    <div className="glass-card rounded-xl p-5 space-y-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Scorecard Preview</h3>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-600 dark:text-violet-300">
          {candidateName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">{candidateName}</p>
          <p className="text-xs text-secondary">{candidateRole}</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative">
          <ReadinessRing score={compositeScore} size={120} label="COMPOSITE" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Knowledge</p>
          <p className="text-lg font-bold text-primary">{knowledgeScore ?? '—'}<span className="text-xs text-muted">/10</span></p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Delivery</p>
          <p className="text-lg font-bold text-primary">{deliveryScore ?? '—'}<span className="text-xs text-muted">/10</span></p>
        </div>
      </div>

      {earlyIndicators.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Early Indicators</p>
          <div className="space-y-2">
            {earlyIndicators.map((indicator, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] text-emerald-600 dark:text-emerald-400">✓</span>
                <span className="text-xs text-secondary leading-relaxed">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={onComplete}
          className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          Complete Assessment
        </button>
        <button
          onClick={onRequestReview}
          className="glass-button w-full rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:text-primary"
        >
          Request Peer Review
        </button>
      </div>

      <div className="rounded-lg bg-violet-500/10 p-3">
        <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">Evaluator Tip</p>
        <p className="mt-1 text-[11px] text-secondary leading-relaxed">
          Focus your notes on the <em>evidence</em> provided during the defense rather than general impressions.
        </p>
      </div>
    </div>
  );
}
