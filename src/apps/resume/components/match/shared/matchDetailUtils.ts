import { FitVerdict, SkillMatchStatus, SonnetAnalysis } from '../../../types';

export function getStatusChipClasses(status: SkillMatchStatus): string {
  switch (status) {
    case 'met': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    case 'surpassed': return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
    case 'partial': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'missing': return 'bg-red-500/15 text-red-700 dark:text-red-400';
  }
}

export function getStatusLabel(status: SkillMatchStatus): string {
  switch (status) {
    case 'met': return 'Met';
    case 'surpassed': return 'Surpassed';
    case 'partial': return 'Partial';
    case 'missing': return 'Missing';
  }
}

export function getStatusDotColor(status: SkillMatchStatus): string {
  switch (status) {
    case 'met': return 'bg-emerald-500';
    case 'surpassed': return 'bg-blue-500';
    case 'partial': return 'bg-amber-500';
    case 'missing': return 'bg-red-500';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
}

export function getConfidenceBarClass(confidence: number): string {
  if (confidence >= 85) return 'bg-emerald-500';
  if (confidence >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export function getFitVerdictConfig(verdict: FitVerdict) {
  switch (verdict) {
    case 'strong-fit':
      return { label: 'Strong Fit', icon: '✅', classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', calloutBg: 'bg-emerald-500/5 border-emerald-500/20' };
    case 'good-fit':
      return { label: 'Good Fit', icon: '👍', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', calloutBg: 'bg-blue-500/5 border-blue-500/20' };
    case 'partial-fit':
      return { label: 'Partial Fit', icon: '⚠️', classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', calloutBg: 'bg-amber-500/5 border-amber-500/20' };
    case 'not-a-fit':
      return { label: 'Not a Fit', icon: '❌', classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', calloutBg: 'bg-red-500/5 border-red-500/20' };
    default:
      return { label: 'Unknown', icon: '❓', classes: 'bg-gray-500/10 text-gray-500', calloutBg: 'bg-gray-500/5 border-gray-500/20' };
  }
}

export function getSeverityBadgeClasses(severity: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-500/10 text-red-600 dark:text-red-400',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };
  return colors[severity] ?? colors.low;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

export const PRIORITY_ORDER: Record<string, number> = { required: 0, 'nice-to-have': 1, optional: 2 };
export const STATUS_ORDER: Record<string, number> = { met: 0, surpassed: 1, partial: 2, missing: 3 };
export const PRIORITY_LABELS: Record<string, string> = { required: 'Required', 'nice-to-have': 'Nice to Have', optional: 'Optional' };

export function parseSummaryVerdict(summary: string): { verdict: FitVerdict | null; reasoning: string } {
  const patterns: { match: RegExp; verdict: FitVerdict }[] = [
    { match: /^NOT\s+A\s+FIT[\.\:\-\u2014]\s*/i, verdict: 'not-a-fit' },
    { match: /^PARTIAL\s+FIT[\.\:\-\u2014]\s*/i, verdict: 'partial-fit' },
    { match: /^GOOD\s+FIT[\.\:\-\u2014]\s*/i, verdict: 'good-fit' },
    { match: /^STRONG\s+FIT[\.\:\-\u2014]\s*/i, verdict: 'strong-fit' },
  ];

  for (const { match, verdict } of patterns) {
    if (match.test(summary)) {
      return { verdict, reasoning: summary.replace(match, '').trim() };
    }
  }

  return { verdict: null, reasoning: summary };
}

export const AI_ASSESSMENT_SECTIONS: { key: keyof SonnetAnalysis; title: string; icon: string; borderColor: string }[] = [
  { key: 'whyRightFit', title: 'Why This Candidate Is the Right Fit', icon: '🎯', borderColor: 'border-emerald-500' },
  { key: 'immediateValue', title: 'Immediate Value to the Team', icon: '⚡', borderColor: 'border-blue-500' },
  { key: 'rampUpEstimate', title: 'Ramp-Up Time Estimate', icon: '⏱️', borderColor: 'border-indigo-500' },
  { key: 'riskFactors', title: 'Risk Factors & Mitigation', icon: '⚠️', borderColor: 'border-amber-500' },
  { key: 'beyondJd', title: 'Beyond the Job Description', icon: '💎', borderColor: 'border-violet-500' },
  { key: 'leadershipDynamics', title: 'Leadership & Team Dynamics', icon: '👥', borderColor: 'border-teal-500' },
  { key: 'industryDepth', title: 'Industry & Domain Depth', icon: '🏥', borderColor: 'border-cyan-500' },
  { key: 'trackRecord', title: 'Track Record & Proof Points', icon: '📊', borderColor: 'border-violet-500' },
  { key: 'culturalFit', title: 'Cultural & Work Style Compatibility', icon: '🌍', borderColor: 'border-rose-500' },
  { key: 'retentionPotential', title: 'Retention & Long-Term Potential', icon: '🔒', borderColor: 'border-sky-500' },
];
