interface VectorizingAnimationProps {
  currentRecord?: string;
  processedCount: number;
  totalCount: number;
}

export default function VectorizingAnimation({
  currentRecord,
  processedCount,
  totalCount,
}: VectorizingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative w-32 h-32 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-violet-300/40 dark:border-violet-500/20 animate-[spin_12s_linear_infinite]" />

        <div className="absolute inset-3 rounded-full border-2 border-dashed border-indigo-300/50 dark:border-indigo-500/25 animate-[spin_8s_linear_infinite_reverse]" />

        <div className="absolute inset-6 rounded-full border-2 border-violet-400/60 dark:border-violet-500/40 animate-pulse" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30 animate-pulse" />
        </div>

        {[0, 120, 240].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 animate-[spin_4s_linear_infinite]"
            style={{ animationDelay: `${i * -1.33}s` }}
          >
            <div
              className="absolute w-2.5 h-2.5 rounded-full bg-violet-400 dark:bg-violet-300 shadow-sm"
              style={{ top: '4px', left: '50%', transform: 'translateX(-50%)' }}
            />
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-primary mb-1">
          Vectorizing {processedCount} / {totalCount}
        </p>
        {currentRecord && (
          <p className="text-xs text-muted animate-pulse truncate max-w-xs">
            Processing: {currentRecord}
          </p>
        )}
        <p className="text-[10px] text-muted mt-2">
          Voyage AI · 1536-dim embeddings
        </p>
      </div>
    </div>
  );
}
