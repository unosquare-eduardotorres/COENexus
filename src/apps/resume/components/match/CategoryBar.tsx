interface CategoryBarProps {
  label: string;
  value: number;
  description?: string;
  tooltip?: string;
}

function getFillClass(value: number): string {
  if (value >= 85) return 'bg-emerald-500';
  if (value >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function CategoryBar({ label, value, description, tooltip }: CategoryBarProps) {
  const fillClass = getFillClass(value);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs text-secondary relative group cursor-default">
            {label}
            {tooltip && !description && (
              <span className="invisible group-hover:visible absolute left-0 -top-8 z-10 px-2 py-1 text-[10px] text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg whitespace-nowrap">
                {tooltip}
              </span>
            )}
          </span>
          {description && (
            <span className="text-[10px] text-muted leading-tight">{description}</span>
          )}
        </div>
        <span className="text-xs font-mono text-secondary">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full ${fillClass} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
