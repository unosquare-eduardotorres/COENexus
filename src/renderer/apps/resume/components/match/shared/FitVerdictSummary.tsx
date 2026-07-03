import { FitVerdict } from '../../../types';
import { parseSummaryVerdict, getFitVerdictConfig } from './matchDetailUtils';

interface FitVerdictSummaryProps {
  summary: string;
  fitVerdict?: FitVerdict;
  variant?: 'inline' | 'block';
}

export default function FitVerdictSummary({ summary, fitVerdict, variant = 'block' }: FitVerdictSummaryProps) {
  const parsed = parseSummaryVerdict(summary);
  const verdict = fitVerdict ?? parsed.verdict;
  const reasoning = parsed.reasoning;

  if (!verdict) {
    return <span>{summary}</span>;
  }

  const config = getFitVerdictConfig(verdict);

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${config.classes}`}>
          {config.icon} {config.label}
        </span>
        <span className="truncate" title={reasoning}>{reasoning}</span>
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-semibold text-sm ${config.classes}`}>
        <span>{config.icon}</span>
        {config.label}
      </div>
      <p className="text-sm text-secondary">{reasoning}</p>
    </div>
  );
}
