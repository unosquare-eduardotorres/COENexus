import type { PipelineStats as PipelineStatsType } from '../../types';

interface PipelineStatsProps {
  stats: PipelineStatsType;
}

interface StatBadge {
  label: string;
  value: string;
}

export default function PipelineStats({ stats }: PipelineStatsProps) {
  const statBadges: StatBadge[] = [
    { label: 'Profiles Scanned', value: stats.profilesScanned },
    { label: 'Pre-filtered', value: stats.preFiltered },
    { label: 'Constraints Applied', value: stats.constraintsApplied },
    { label: 'Haiku Triage', value: stats.haikuTriage },
    { label: 'Sonnet Analyzed', value: stats.sonnetAnalyzed },
    { label: 'Search Cost', value: stats.searchCost },
    { label: 'Time', value: stats.time },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statBadges.map((stat) => (
        <div key={stat.label} className="glass-panel-subtle rounded-xl px-3 py-2">
          <div className="text-xs text-muted">{stat.label}</div>
          <div className="text-sm font-mono font-semibold text-primary">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
