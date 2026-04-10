interface YearSelectorProps {
  selectedYear: number | null;
  onYearChange: (year: number) => void;
  disabled?: boolean;
}

const YEARS = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014,
];

export default function YearSelector({ selectedYear, onYearChange, disabled }: YearSelectorProps) {
  return (
    <div className={`glass-panel-subtle rounded-xl p-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex gap-2 overflow-x-auto">
        {YEARS.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedYear === year
                ? 'ring-2 ring-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                : 'bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border text-secondary hover:border-accent-400/40'
            }`}
          >
            {year}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onYearChange(2013)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedYear === 2013
              ? 'ring-2 ring-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
              : 'bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border text-secondary hover:border-accent-400/40'
          }`}
        >
          2013 & Older
        </button>
      </div>
    </div>
  );
}
