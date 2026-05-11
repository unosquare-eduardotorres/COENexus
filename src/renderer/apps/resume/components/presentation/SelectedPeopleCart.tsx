import type { SelectedPerson } from '../../types'

interface SelectedPeopleCartProps {
  selectedPeople: SelectedPerson[]
  onRemove: (upstreamId: number, sourceType: 'candidate' | 'employee') => void
}

export default function SelectedPeopleCart({ selectedPeople, onRemove }: SelectedPeopleCartProps) {
  if (selectedPeople.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-4 text-center text-muted text-sm">
        No people selected yet. Search and select candidates or employees below.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-accent-500/30 dark:border-accent-400/20 bg-accent-50/50 dark:bg-accent-900/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-bold">
            {selectedPeople.length}
          </span>
          <span className="text-sm font-semibold text-primary">Selected People</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedPeople.map(person => {
          const isCandidate = person.sourceType === 'candidate'
          return (
            <div
              key={`${person.sourceType}:${person.upstreamId}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm animate-in fade-in duration-200
                ${isCandidate
                  ? 'bg-accent-100 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-700/40 text-accent-800 dark:text-accent-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-300'
                }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${isCandidate ? 'bg-accent-500' : 'bg-emerald-500'}`} />
              <span className="font-medium">{person.fullName}</span>
              <span className="opacity-60 text-xs">({person.mainSkill})</span>
              <button
                onClick={() => onRemove(person.upstreamId, person.sourceType)}
                className={`ml-1 transition-colors ${isCandidate
                  ? 'text-accent-400 hover:text-red-500 dark:text-accent-500 dark:hover:text-red-400'
                  : 'text-emerald-400 hover:text-red-500 dark:text-emerald-500 dark:hover:text-red-400'
                }`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
