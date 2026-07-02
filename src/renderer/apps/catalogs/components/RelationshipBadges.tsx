interface RelationshipBadgesProps {
  items: { id: number; name: string }[];
  max?: number;
  emptyText?: string;
}

export default function RelationshipBadges({ items, max = 4, emptyText = 'None' }: RelationshipBadgesProps) {
  if (items.length === 0) {
    return <span className="text-xs text-muted italic">{emptyText}</span>;
  }

  const visible = items.slice(0, max);
  const remaining = items.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(item => (
        <span
          key={item.id}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20"
        >
          {item.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-400 border border-white/10">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
