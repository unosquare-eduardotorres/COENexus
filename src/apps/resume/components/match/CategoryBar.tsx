interface CategoryBarProps {
  label: string;
  value: number;
}

function getFillClass(value: number): string {
  if (value >= 85) return 'bg-emerald-500';
  if (value >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function CategoryBar({ label, value }: CategoryBarProps) {
  const fillClass = getFillClass(value);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-secondary">{label}</span>
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
