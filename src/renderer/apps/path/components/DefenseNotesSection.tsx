interface DefenseNotesSectionProps {
  tabNames: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  quickTags: string[];
}

export default function DefenseNotesSection({ tabNames, activeTab, onTabChange, notes, onNotesChange, quickTags }: DefenseNotesSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold text-violet-600 dark:text-violet-300">03</span>
        <h2 className="text-lg font-bold text-primary">Defense Session Notes</h2>
      </div>
      <div className="glass-card rounded-xl p-5">
        <div className="flex gap-1 border-b border-white/10 pb-2">
          {tabNames.map((tab, i) => (
            <button
              key={tab}
              onClick={() => onTabChange(i)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                activeTab === i
                  ? 'font-semibold text-primary border-b-2 border-violet-500'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <textarea
          className="glass-input mt-3 w-full rounded-lg px-3 py-3 text-sm"
          rows={6}
          placeholder="Start typing live notes during the defense session..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {quickTags.map((tag) => (
            <button key={tag} className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-500/20">
              {tag}
            </button>
          ))}
          <button className="rounded-full border border-dashed border-gray-300 dark:border-white/20 px-3 py-1 text-xs text-muted hover:text-primary">
            + Tag
          </button>
        </div>
      </div>
    </section>
  );
}
