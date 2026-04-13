interface PromotionGateCardProps {
  name: string;
  status: 'met' | 'blocked' | 'in-progress' | 'pending';
  detail: string;
  verifiedBy?: string;
}

const statusConfig = {
  met: { label: 'Met', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', icon: '✓' },
  blocked: { label: 'Blocked', bg: 'bg-red-500/10 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400', icon: '!' },
  'in-progress': { label: 'In Progress', bg: 'bg-amber-500/10 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', icon: '◐' },
  pending: { label: 'Pending', bg: 'bg-gray-500/10 dark:bg-gray-500/15', text: 'text-gray-500 dark:text-gray-400', icon: '○' },
};

export default function PromotionGateCard({ name, status, detail, verifiedBy }: PromotionGateCardProps) {
  const cfg = statusConfig[status];

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${cfg.bg} ${cfg.text}`}>
            {cfg.icon}
          </span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{name}</p>
            <p className="mt-0.5 text-sm font-medium text-primary">{cfg.label}</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-secondary">{detail}</p>
      {verifiedBy && <p className="mt-1 text-[11px] text-muted">Verified by {verifiedBy}</p>}
    </div>
  );
}
