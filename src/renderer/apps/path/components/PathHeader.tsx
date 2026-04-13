interface PathHeaderProps {
  fromLevel: string;
  toLevel: string;
  description: string;
  completedTopics: number;
  totalTopics: number;
}

export default function PathHeader({ fromLevel, toLevel, description, completedTopics, totalTopics }: PathHeaderProps) {
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-6 text-white">
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            Software Engineering
          </span>
          <span className="text-xs text-white/50">Institutional Path</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          {fromLevel} <span className="mx-2 text-white/40">&rarr;</span> {toLevel}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/60">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Current Milestone Progress</span>
            <span className="text-sm font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 w-48 rounded-full bg-white/15">
            <div
              className="h-2 rounded-full bg-emerald-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{completedTopics}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/50">Topics Done</p>
            </div>
            <div>
              <p className="text-lg font-bold">{String(totalTopics - completedTopics).padStart(2, '0')}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/50">Remaining</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
