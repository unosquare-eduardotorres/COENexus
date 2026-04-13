import type { ResourceTier } from '../types';

const tierConfig: Record<ResourceTier, { label: string; className: string }> = {
  gold: { label: 'COE Curated', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  dynamic: { label: 'AI Surfaced', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  platform: { label: 'Platform', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  community: { label: 'Community', className: 'bg-purple-500/15 text-purple-700 dark:text-purple-300' },
};

interface ResourceBadgeProps {
  tier: ResourceTier;
}

export default function ResourceBadge({ tier }: ResourceBadgeProps) {
  const cfg = tierConfig[tier];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
